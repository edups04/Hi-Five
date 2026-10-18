"""
tcn.py
-------
Temporal Convolutional Network (TCN) for sign language recognition.

Architecture:
    Input: (batch, seq_len, feature_dim)
        ↓
    Input projection
        ↓
    TCN Block 1 (channels=64,  dilation=1)
        ↓
    TCN Block 2 (channels=128, dilation=2)
        ↓
    TCN Block 3 (channels=128, dilation=4)
        ↓
    TCN Block 4 (channels=256, dilation=8)
        ↓
    Global average pooling
        ↓
    Dropout + Dense
        ↓
    num_classes (softmax)
"""

from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class TCNBlock(nn.Module):
    """
    One dilated temporal convolutional block with residual connection.

    Structure:
        Conv1d (dilated, causal) → BatchNorm → ReLU → Dropout
        Conv1d (dilated, causal) → BatchNorm → ReLU → Dropout
        + residual (1x1 conv if channels change)
    """

    def __init__(
        self,
        in_channels:  int,
        out_channels: int,
        kernel_size:  int = 3,
        dilation:     int = 1,
        dropout:      float = 0.2,
    ) -> None:
        super().__init__()

        # Causal padding: only pad left side so no future frames leak
        padding = (kernel_size - 1) * dilation

        self.conv1 = nn.Conv1d(
            in_channels, out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=padding,
        )
        self.bn1   = nn.BatchNorm1d(out_channels)
        self.drop1 = nn.Dropout(dropout)

        self.conv2 = nn.Conv1d(
            out_channels, out_channels,
            kernel_size=kernel_size,
            dilation=dilation,
            padding=padding,
        )
        self.bn2   = nn.BatchNorm1d(out_channels)
        self.drop2 = nn.Dropout(dropout)

        # Residual projection if channel size changes
        self.residual = (
            nn.Conv1d(in_channels, out_channels, kernel_size=1)
            if in_channels != out_channels
            else nn.Identity()
        )

        self.relu = nn.ReLU()
        self._padding = padding

    def _trim(self, x: torch.Tensor, length: int) -> torch.Tensor:
        """Remove right-side padding to restore original sequence length."""
        return x[:, :, :length]

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        length = x.size(2)
        residual = self.residual(x)

        out = self.conv1(x)
        out = self._trim(out, length)
        out = self.relu(self.bn1(out))
        out = self.drop1(out)

        out = self.conv2(out)
        out = self._trim(out, length)
        out = self.relu(self.bn2(out))
        out = self.drop2(out)

        return self.relu(out + residual)


class SignTCN(nn.Module):
    """
    Full TCN model for sign language recognition.

    Input shape:  (batch, seq_len, feature_dim)  e.g. (32, 64, 290)
    Output shape: (batch, num_classes)
    """

    def __init__(
        self,
        feature_dim:  int,
        num_classes:  int,
        channels:     list[int] = [64, 128, 128, 256],
        dilations:    list[int] = [1, 2, 4, 8],
        kernel_size:  int       = 3,
        dropout:      float     = 0.2,
        fc_dropout:   float     = 0.4,
    ) -> None:
        super().__init__()

        assert len(channels) == len(dilations), \
            "channels and dilations must have the same length"

        # Input projection: feature_dim → first channel
        self.input_proj = nn.Sequential(
            nn.Conv1d(feature_dim, channels[0], kernel_size=1),
            nn.BatchNorm1d(channels[0]),
            nn.ReLU(),
        )

        # TCN blocks
        blocks = []
        in_ch  = channels[0]
        for out_ch, dil in zip(channels, dilations):
            blocks.append(TCNBlock(in_ch, out_ch, kernel_size, dil, dropout))
            in_ch = out_ch
        self.tcn_blocks = nn.Sequential(*blocks)

        # Classification head
        self.classifier = nn.Sequential(
            nn.Dropout(fc_dropout),
            nn.Linear(channels[-1], 128),
            nn.ReLU(),
            nn.Dropout(fc_dropout / 2),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, feature_dim)
        # Conv1d expects (batch, channels, seq_len)
        x = x.permute(0, 2, 1)

        x = self.input_proj(x)
        x = self.tcn_blocks(x)

        # Global average pooling over time
        x = x.mean(dim=2)

        return self.classifier(x)

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)

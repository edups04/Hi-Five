<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'db.php';

$data     = json_decode(file_get_contents('php://input'), true);
$email    = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'All fields are required.']);
    exit;
}

$stmt = $conn->prepare('SELECT id, username, password FROM users WHERE email = ?');
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->bind_result($id, $username, $hashed);
$stmt->fetch();

if (!$hashed) {
    echo json_encode(['success' => false, 'message' => 'User not registered.']);
    exit;
}

if (password_verify($password, $hashed)) {
    echo json_encode([
        'success'  => true,
        'message'  => 'Login successful.',
        'id'       => $id,
        'username' => $username,
        'email'    => $email
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Incorrect password.']);
}
?>
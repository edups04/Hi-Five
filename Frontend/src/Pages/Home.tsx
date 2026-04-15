import { Link, useNavigate } from 'react-router-dom';

function Home() {

    const navigate = useNavigate();

    function logout() {
        localStorage.removeItem("user");
        navigate("/");
    }

    return (
        <>
            <nav>
                <Link to ="/">Home</Link>
                <Link to ="/login">Login</Link>
            </nav>
            <h1>Welcome to the Home Page</h1>
            <button onClick={logout} className="btn btn-danger">
                LOGOUT
            </button>
        </>
    );
}

export default Home;
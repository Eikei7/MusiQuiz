import './Login.css'


function Login() {

  return (
    <>
      <img src="/logo_big_2.png" alt="MusiQuiz logo" />
            <div className="login-container">
                <form className="login-form">
                    <div className="input-group">
                        <input 
                            type="text" 
                            id="email" 
                            name="email"
                            placeholder="Username (email address)" 
                            required 
                            autoComplete="username"
                        />
                    </div>
                    <div className="input-group">
                        <input 
                            type="password" 
                            id="password" 
                            name="password"
                            placeholder="Password"
                            required 
                            autoComplete="current-password"
                        />
                    </div>
                    <div className="input-group">
                        <button type="submit">Let's GO!</button>
                    </div>
                    <div className="login-links">
                    <span><a href="/register">Register</a></span>
                    <span><a href="/forgot">Forgot Password?</a></span>
                    </div>
                </form>
            </div>
    </>
  )
}

export default Login

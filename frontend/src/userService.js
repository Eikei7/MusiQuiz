// frontend service to handle user authentication
export const userService = {
  register,
  login,
  logout,
  getUsers
};

async function register(email, password, confirmPassword) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, confirmPassword })
  };

  return fetch(`https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com/users`, requestOptions)
    .then(handleResponse)
    .then(user => {
      return user;
    });
}

async function login(email, password) {
  const requestOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  };

  return fetch(`https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com/login`, requestOptions)
    .then(handleResponse)
    .then(response => {
      // store user details and jwt token in local storage to keep user logged in between page refreshes
      localStorage.setItem('currentUser', JSON.stringify(response.user));
      return response.user;
    });
}

function logout() {
  // remove user from local storage to log user out
  localStorage.removeItem('currentUser');
}

async function getUsers() {
  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  
  // Check if user is logged in
  if (!currentUser) {
    return Promise.reject('You must be logged in to access this resource');
  }
  
  // Future enhancement: check if user has admin role
  
  const requestOptions = {
    method: 'GET',
    headers: { 
      'Content-Type': 'application/json',
      // Future enhancement: add Authorization header with JWT token
    }
  };

  return fetch(`https://6jdz3s8jrh.execute-api.eu-north-1.amazonaws.com/users`, requestOptions)
    .then(handleResponse);
}

function handleResponse(response) {
  return response.text().then(text => {
    const data = text && JSON.parse(text);
    if (!response.ok) {
      if (response.status === 401) {
        // auto logout if 401 response returned from api
        logout();
      }

      const error = (data && data.message) || response.statusText;
      return Promise.reject(error);
    }

    return data;
  });
}
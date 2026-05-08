// RailTrack-AI Authentication System
// User Database with Role Mapping (Simplified - 3 Test Users)

const AUTH_DB = {
    'test1': { password: 'password1', name: 'Test User 1', role: 'controller', hub: 'Bangalore Central' },
    'test2': { password: 'password2', name: 'Test User 2', role: 'supervisor', hub: 'Majestic Hub' },
    'test3': { password: 'password3', name: 'Test User 3', role: 'engineer', hub: 'Yeshwantpur Hub' }
};

const SESSION_KEY = 'railtrack_session';

// Login Function
function login(userId, password) {
    userId = userId.toLowerCase().trim();
    password = password.trim();
    
    if (!AUTH_DB[userId]) {
        return { success: false, message: 'Invalid User ID' };
    }
    
    if (AUTH_DB[userId].password !== password) {
        return { success: false, message: 'Invalid Password' };
    }
    
    const user = AUTH_DB[userId];
    const session = {
        userId: userId,
        name: user.name,
        role: user.role,
        hub: user.hub,
        loginTime: new Date().toISOString()
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true, user: session };
}

// Logout Function
function logout() {
    localStorage.removeItem(SESSION_KEY);
}

// Get Current Session
function getSession() {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
}

// Check if User is Authenticated
function isAuthenticated() {
    return getSession() !== null;
}

// Verify Authentication and Redirect if needed
function verifyAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Get User Role
function getUserRole() {
    const session = getSession();
    return session ? session.role : null;
}

// Get User Name
function getUserName() {
    const session = getSession();
    return session ? session.name : null;
}

// Get User Hub
function getUserHub() {
    const session = getSession();
    return session ? session.hub : null;
}

// Get User ID
function getUserId() {
    const session = getSession();
    return session ? session.userId : null;
}

// Role to Display Name
function getRoleDisplayName(role) {
    const roleNames = {
        'controller': 'Regional Controller',
        'supervisor': 'Hub Supervisor',
        'engineer': 'Field Engineer'
    };
    return roleNames[role] || role;
}

// Get All Available Users (for demo/testing)
function getAllUsers() {
    const users = [];
    for (const userId in AUTH_DB) {
        const user = AUTH_DB[userId];
        users.push({
            id: userId,
            name: user.name,
            password: user.password,
            role: getRoleDisplayName(user.role),
            hub: user.hub
        });
    }
    return users;
}

import { useState, useEffect, useRef } from 'react';
import './HamburgerMenu.css';

function HamburgerMenu({ user, logout, onSettingsClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get the user's first name from metadata
  const getUserName = () => {
    if (user?.user_metadata?.first_name) {
      return user.user_metadata.first_name;
    }
    if (user?.raw_user_meta_data?.first_name) {
      return user.raw_user_meta_data.first_name;
    }
    // Fallback to email username
    return user?.email?.split('@')[0] || 'User';
  };

  return (
    <div className="hamburger-menu-container" ref={menuRef}>
      <button className="hamburger-button" onClick={toggleMenu}>
        <div className={`hamburger-icon ${isOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      <div className={`menu-overlay ${isOpen ? 'show' : ''}`} onClick={toggleMenu}></div>

      <div className={`menu-content ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3>Menu</h3>
          <button className="close-menu" onClick={toggleMenu}>&times;</button>
        </div>

        <div className="menu-user-info">
          <p>Welcome, {getUserName()}!</p>
        </div>

        <nav className="menu-nav">
          <ul>
            <li>
              <button className="menu-item" onClick={() => {
                onSettingsClick();
                setIsOpen(false);
              }}>
                Settings
              </button>
            </li>
            <li>
              <button className="menu-item" onClick={() => {
                logout();
                setIsOpen(false);
              }}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default HamburgerMenu;
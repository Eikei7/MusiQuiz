import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import './Card.css';

const Card = ({ 
  id,
  artist, 
  track, 
  year, 
  imageUrl, 
  isDropped, 
  onDragEnd, 
  flipped, 
  locked,

}) => {
  const audioRef = useRef(null);


  const handleDragStart = () => {
    const cardData = {
      id
    };
    
    const event = new Event('dragstart');
    event.dataTransfer = {
      setData: () => {},
      getData: () => JSON.stringify(cardData)
    };
  };

  return (
    <motion.div
      className={`card ${flipped ? 'flipped' : ''} ${isDropped ? 'dropped' : ''}`}
      drag={!locked}
      dragMomentum={false}
      whileDrag={{ scale: 0.7 }}
      whileHover={{ scale: isDropped ? 1 : 1.05 }}
      style={{
        cursor: isDropped ? (locked ? 'default' : 'pointer') : 'grab',
      }}
      onDragStart={handleDragStart}
      onDragEnd={(event, info) => {
        if (onDragEnd) {
          onDragEnd(event, info, {
            id
          });
        }
      }}
    >
      <div className="card-side card-front">
        <div>
          <p className="glowing-text">Question</p>
        </div>
        <div className="card-footer">
          {isDropped && (
            <button 
              className="flip-button" 
              onClick={handleFlip}
            >
              Flip
            </button>
          )}
        </div>
      </div>

      <div className="card-side card-back">
        <div className="card-header">
        </div>
        <div className="card-body">
        </div>
        <div className="card-footer">
        </div>
      </div>
    </motion.div>
  );
};

export default Card;
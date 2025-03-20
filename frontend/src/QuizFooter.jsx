import React from 'react';
import "./QuizTime.css";

const QuizFooter = ({ selectedHotspot, isAnswerCorrect, disabled }) => {
  const options = ['A', 'B', 'C', 'D'];
  
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="hotspots-container">
          {options.map((option, index) => (
            <div 
              key={index}
              className={`answer-hotspot 
                ${selectedHotspot === index ? 'selected' : ''} 
                ${isAnswerCorrect !== null && selectedHotspot === index ? 
                  (isAnswerCorrect ? 'correct' : 'incorrect') : ''} 
                ${disabled ? 'disabled' : ''}
              `}
            >
              <span className="hotspot-letter">{option}</span>
              <span className="hotspot-instruction">
                {disabled ? '' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default QuizFooter;

// import React from 'react';
// import "./QuizTime.css";

// const QuizFooter = ({ selectedHotspot, isAnswerCorrect }) => {
//   const options = ['A', 'B', 'C', 'D'];
  
//   return (
//     <footer className="footer">
//       <div className="footer-content">
//         <div className="hotspots-container">
//           {options.map((option, index) => (
//             <div 
//               key={index}
//               className={`answer-hotspot ${selectedHotspot === index ? 'selected' : ''} ${
//                 isAnswerCorrect !== null && selectedHotspot === index ? 
//                   (isAnswerCorrect ? 'correct' : 'incorrect') : ''
//               }`}
//             >
//               <span className="hotspot-letter">{option}</span>
//               <span className="hotspot-instruction">Drop answer here</span>
//             </div>
//           ))}
//         </div>
//       </div>
//     </footer>
//   );
// };

// export default QuizFooter;
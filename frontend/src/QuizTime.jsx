import React from "react";
import Card from "./Card";
import "./QuizTime.css";
import QuizFooter from "./QuizFooter";

const QuizTime = () => {
  return (
    <div className="container">
      <h1>Quiz Time!</h1>
      <Card />
      <QuizFooter />
    </div>
  );
}

export default QuizTime;
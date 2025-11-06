import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DifficultySelectPage.css';

const DifficultySelectPage = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(4); // 중앙 레벨 (0-8, 소수점 가능)
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const startXRef = useRef(0);
  const startLevelRef = useRef(4);

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleDifficultySelect = () => {
    const difficulty = Math.round(selectedLevel) + 1; // 1-9
    navigate(`/minitetris/${difficulty}`);
  };

  const handleBack = () => {
    navigate('/lobby');
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    startLevelRef.current = selectedLevel;
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    startLevelRef.current = selectedLevel;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startXRef.current;
    const levelOffset = deltaX / 80; // 80px당 1레벨, 소수점 포함
    const newLevel = startLevelRef.current - levelOffset;
    
    // 범위 제한
    const clampedLevel = Math.max(0, Math.min(8, newLevel));
    setSelectedLevel(clampedLevel);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const deltaX = e.touches[0].clientX - startXRef.current;
    const levelOffset = deltaX / 80;
    const newLevel = startLevelRef.current - levelOffset;
    
    const clampedLevel = Math.max(0, Math.min(8, newLevel));
    setSelectedLevel(clampedLevel);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // 손을 떼면 가장 가까운 정수 레벨로 스냅
    setSelectedLevel(Math.round(selectedLevel));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, selectedLevel]);

  return (
    <div className="difficulty-container">
      <div className="difficulty-header">
        <h1>레벨 선택</h1>
        <div className="instruction-image">
          <img src="/images/login.a.png" alt="드래그 안내" />
        </div>
      </div>

      <div className="slider-container" ref={sliderRef}>
        <div className="slider-line"></div>
        <div 
          className="slider-track"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {levels.map((level, index) => {
            const offset = (index - selectedLevel) * 120; // selectedLevel이 소수점일 수 있음
            const isCenter = Math.abs(index - selectedLevel) < 0.5; // 가장 가까운 원
            const distance = Math.abs(index - selectedLevel);
            const scale = isCenter ? 1.5 : Math.max(0.6, 1 - distance * 0.15);
            const opacity = Math.max(0.3, 1 - distance * 0.2);
            
            return (
              <div
                key={level}
                className={`level-circle ${isCenter ? 'active' : ''}`}
                style={{
                  transform: `translateX(${offset}px) scale(${scale})`,
                  opacity: opacity,
                  transition: 'transform 0.5s ease-out, opacity 0.5s ease-out'

                }}
              >
              </div>
            );
          })}
        </div>
      </div>

      <div className="selection-info">
        <h2>레벨 {Math.round(selectedLevel) + 1}</h2>
        <p>이 레벨을 시작하시겠습니까?</p>
        <button onClick={handleDifficultySelect} className="select-button">
          선택하기
        </button>
      </div>

      <button onClick={handleBack} className="back-button">
        뒤로 가기
      </button>
    </div>
  );
};

export default DifficultySelectPage;
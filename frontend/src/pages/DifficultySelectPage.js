import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DifficultySelectPage.css';

const DifficultySelectPage = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState(4);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const startXRef = useRef(0);
  const startLevelRef = useRef(4);

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const planets = [
    { name: '태양', desc: ['미정', '최종 난이도'], color: 'beginner' },
    { name: '수성', desc: ['미정'], color: 'easy' },
    { name: '금성', desc: ['미정'], color: 'normal' },
    { name: '지구', desc: ['미정'], color: 'medium' },
    { name: '화성', desc: ['미정'], color: 'intermediate' },
    { name: '목성', desc: ['미정'], color: 'hard' },
    { name: '토성', desc: ['미정'], color: 'very-hard' },
    { name: '천왕성', desc: ['미정'], color: 'expert' },
    { name: '해왕성', desc: ['미정'], color: 'master' }
  ];

  const handleDifficultySelect = () => {
    const difficulty = Math.round(selectedLevel) + 1;
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
    const levelOffset = deltaX / 80;
    const newLevel = startLevelRef.current - levelOffset;
    
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
        <div className="instruction-image">
          <img src={`/images/${Math.round(selectedLevel) + 1}.png`} 
         alt={planets[Math.round(selectedLevel)].name} />
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
            const offset = (index - selectedLevel) * 120;
            const isCenter = Math.abs(index - selectedLevel) < 0.5;
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
                <img src={`/images/${level}.png`} alt={planets[level-1].name} 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
            );
          })}
        </div>
      </div>

      <div className="selection-info">
        <h2>{planets[Math.round(selectedLevel)].name}</h2>
        <div className="difficulty-tags">
          {planets[Math.round(selectedLevel)].desc.map((description, index) => (
            <span 
              key={index} 
              className={`difficulty-tag ${planets[Math.round(selectedLevel)].color}`}
            >
              {description}
            </span>
          ))}
        </div>
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
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

  /* 행성별 태그, 설명 글 */
  const planets = [
    { 
      name: '태양', 
      desc: ['항성', '핵융합', '에너지'], 
      color: 'beginner',
      description: `태양은 태양계의 중심에 있는 항성으로,
      내부에서 수소 핵융합 반응을 통해 막대한 에너지를 생성합니다.
      태양계 전체 질량의 99.86%를 차지하며, 끊임없이 빛과 열을 방출하고 있습니다.`
    },
    { 
      name: '수성', 
      desc: ['온도차', '공전 빠름'], 
      color: 'easy',
      description: `수성은 태양에 가장 가까운 행성으로 88일 만에 공전합니다.
      대기가 거의 없어 낮에는 430°C, 밤에는 -180°C로 태양계에서 가장 극심한 온도 차를 보입니다.
      
      ` 
    },
    {
      name: '금성',
      desc: ['불안정', '혼란'],
      color: 'normal',
      description: `금성은 태양계에서 유일하게 시계방향으로 자전하는 행성입니다.
    두꺼운 대기층으로 덮여있어 표면을 직접 관측하기 어렵고,
    극도로 뜨거운 온도와 황산 구름으로 가득한 혼돈의 세계입니다.`
    },

    { 
      name: '지구', 
      desc: ['밸런스', '안전'], 
      color: 'medium',
      description: `지구는 태양계에서 유일하게 생명체가 살고 있는 행성입니다.
      적절한 대기, 물, 온도 등 완벽한 균형을 이루고 있어 생명이 번성할 수 있는 안전한 환경을 제공합니다.
      
      ` 
    },
    { 
      name: '화성', 
      desc: ['척박', '위험'], 
      color: 'intermediate',
      description: `화성은 붉은 사막으로 덮인 척박한 행성입니다.
      얇은 대기와 낮은 온도, 강한 방사선으로 인해 생명체가 살기 매우 어려운 위험한 환경입니다.
      
      `
    },
    { 
      name: '목성', 
      desc: ['혼돈', '대적점'], 
      color: 'hard',
      description: `목성은 태양계에서 가장 큰 행성으로,
      고체 표면 없이 수소와 헬륨 가스로 이루어져 있습니다.
      거대한 대기 속에는 지구보다 큰 대적점이라는 거대한 폭풍이 수백 년째 지속되고 있습니다.`
    },
    { 
      name: '토성', 
      desc: ['고리'], 
      color: 'very-hard',
      description: `토성은 얼음과 암석 조각들로 이루어진 아름다운 고리로 유명합니다.
      이 고리는 토성 주변을 감싸며 회전하고 있으며,
      태양계에서 가장 인상적인 천체 구조 중 하나입니다.`
    },
    { 
      name: '천왕성', 
      desc: ['비정상', '예측 불가'], 
      color: 'expert',
      description: `천왕성은 자전축이 98도 기울어져 있어 옆으로 누운 채 공전하는 독특한 행성입니다.
      이 비정상적인 자전으로 인해 극지방에서는 42년 동안 낮이 지속되는 예측 불가능한 계절 변화를 겪습니다.
       
      `
    },
    { 
      name: '해왕성', 
      desc: ['극한', '바람'], 
      color: 'master',
      description: `해왕성은 태양계에서 가장 먼 행성으로,
      영하 200°C의 극한 환경을 가지고 있습니다.
      시속 2,000km가 넘는 태양계 최강의 바람이 불어 격렬한 대기 활동을 보입니다.`
    }
  ];

  const handleDifficultySelect = () => {
    const planetIndex = Math.round(selectedLevel);
    // 행성 이름을 소문자 영문 ID로 변환
    const planetIds = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const planetId = planetIds[planetIndex];
    navigate(`/minitetris/${planetId}`);
  };

  const handleBack = () => {
    navigate('/');
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
        <div className="planet-description">
    <p style={{ whiteSpace: 'pre-line' }}>
      {planets[Math.round(selectedLevel)].description}
    </p>
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
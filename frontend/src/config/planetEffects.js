/**
 * 행성별 방해 효과 설정 파일
 * 
 * 각 행성의 난이도와 특수 효과를 정의합니다.
 */

export const PLANET_EFFECTS = {
  SUN: {
    id: 'sun',
    name: '태양',
    difficulty: 1,
    effectDescription: '4초마다 구멍이\n 2개 뚫린\n 라인 생성', // 👈 추가
    effects: {
      garbageLines: {
        enabled: true,
        interval: 4000,
        holesCount: 2,
        linesCount: 1
      }
    }
  },
  
  MERCURY: {
    id: 'mercury',
    name: '수성',
    difficulty: 2,
    effectDescription: '방해 효과 없음', // 👈 추가
    effects: {}
  },
  
  VENUS: {
    id: 'venus',
    name: '금성',
    difficulty: 3,
    effectDescription: 'Next 영역 차단', // 👈 추가
    effects: {
      hideNext: {
        enabled: true
      }
    }
  },
  
  EARTH: {
    id: 'earth',
    name: '지구',
    difficulty: 4,
    effectDescription: '(튜토리얼)\n방해 효과 없음', // 👈 추가
    effects: {}
  },
  
  MARS: {
    id: 'mars',
    name: '화성',
    difficulty: 5,
    effectDescription: '소프트 드롭을\n하드 드롭으로 변경', // 👈 추가
    effects: {
      downKeyHardDrop: {
        enabled: true
      }
    }
  },
  
  JUPITER: {
    id: 'jupiter',
    name: '목성',
    difficulty: 6,
    effectDescription: '10초마다 2초\n동안 블록 투명화', // 👈 추가
    effects: {
      invisibleBlocks: {
        enabled: true,
        interval: 10000,
        duration: 2000,
        affectsGrid: true,
        affectsCurrent: true
      }
    }
  },
  
  SATURN: {
    id: 'saturn',
    name: '토성',
    difficulty: 7,
    effectDescription: 'Hold 사용 불가', // 👈 추가
    effects: {
      disableHold: {
        enabled: true
      }
    }
  },
  
  URANUS: {
    id: 'uranus',
    name: '천왕성',
    difficulty: 8,
    effectDescription: '좌우 조작이 반전', // 👈 추가
    effects: {
      reverseControls: {
        enabled: true
      }
    }
  },
  
  NEPTUNE: {
    id: 'neptune',
    name: '해왕성',
    difficulty: 9,
    effectDescription: '블록 낙하 속도\n5배', // 👈 추가
    effects: {
      dropSpeedMultiplier: {
        enabled: true,
        multiplier: 5
      }
    }
  }
};

/**
 * 행성 ID로 효과 설정 가져오기
 * @param {string} planetId - 행성 ID (예: 'sun', 'earth', 'mars')
 * @returns {object} 행성 효과 설정
 */
export function getPlanetEffects(planetId) {
  const planetKey = planetId.toUpperCase();
  return PLANET_EFFECTS[planetKey] || PLANET_EFFECTS.EARTH;
}

/**
 * 특정 효과가 활성화되어 있는지 확인
 * @param {object} planetEffects - 행성 효과 설정
 * @param {string} effectName - 효과 이름
 * @returns {boolean} 효과 활성화 여부
 */
export function isEffectEnabled(planetEffects, effectName) {
  return planetEffects?.effects?.[effectName]?.enabled === true;
}

/**
 * 효과 설정 가져오기
 * @param {object} planetEffects - 행성 효과 설정
 * @param {string} effectName - 효과 이름
 * @returns {object|null} 효과 설정 객체
 */
export function getEffectConfig(planetEffects, effectName) {
  if (!isEffectEnabled(planetEffects, effectName)) {
    return null;
  }
  return planetEffects.effects[effectName];
}

export default PLANET_EFFECTS;

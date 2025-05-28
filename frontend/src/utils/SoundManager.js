// SoundManager.js
// 효과음을 관리하는 유틸리티 클래스

class SoundManager {
  constructor() {
    this.sounds = {
      button: new Audio('/sounds/button sound.wav'),
      move: new Audio('/sounds/block moving sound.wav'),
      land: new Audio('/sounds/landing sound.wav')
    };
    
    // 볼륨 설정
    Object.values(this.sounds).forEach(sound => {
      sound.volume = 0.3; // 기본 볼륨 설정 (0.0 ~ 1.0)
    });
    
    // 불럭 이동 효과음은 조금 더 작게 설정
    this.sounds.move.volume = 0.2;
    
    // 사운드 미리 로드
    this.preloadSounds();
  }
  
  preloadSounds() {
    // 모바일 기기에서 사용자 상호작용 없이도 소리가 재생되도록 미리 로드
    Object.values(this.sounds).forEach(sound => {
      sound.load();
    });
  }
  
  play(soundName) {
    if (!this.sounds[soundName]) return;
    
    // 소리 재생 전에 처음으로 되감기 (여러 번 빠르게 재생할 때 필요)
    this.sounds[soundName].currentTime = 0;
    
    // 소리 재생
    this.sounds[soundName].play().catch(error => {
      console.warn(`효과음 재생 실패: ${error}`);
    });
  }
  
  // 볼륨 조절 메서드 (나중에 설정 기능 추가 시 사용)
  setVolume(volume) {
    Object.values(this.sounds).forEach(sound => {
      sound.volume = volume;
    });
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const soundManager = new SoundManager();
export default soundManager;

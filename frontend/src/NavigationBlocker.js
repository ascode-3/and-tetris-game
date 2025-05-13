import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NavigationBlocker = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 메인 페이지('/')에서는 동작하지 않도록 함
    if (location.pathname === '/') {
      return;
    }

    let isConfirmed = false;

    // 새로고침 처리
    const handleBeforeUnload = (e) => {
      // 사용자가 새로고침을 누르면 대화상자 표시
      const confirmMessage = '페이지를 새로고침하면 로그인 페이지로 이동됩니다. 계속하시겠습니까?';
      e.preventDefault();
      e.returnValue = confirmMessage;
      
      // 사용자가 확인을 누르면 세션 스토리지에 플래그 설정
      // 참고: beforeunload에서는 사용자 응답을 감지할 수 없으므로
      // 일단 플래그를 설정하고 페이지가 실제로 새로고침되면 체크함
      sessionStorage.setItem('page_refresh', 'true');
    };

    // 뒤로가기 버튼 처리
    const blockNavigation = (e) => {
      if (!isConfirmed) {
        e.preventDefault();
        const confirmMessage = '로그인 페이지로 이동됩니다. 계속하시겠습니까?';
        
        if (window.confirm(confirmMessage)) {
          isConfirmed = true;
          navigate('/'); // React Router의 navigate 사용하여 리다이렉트
        } else {
          // 현재 URL 유지 (사용자가 취소를 누른 경우)
          window.history.pushState(null, '', location.pathname);
        }
      }
    };

    // 페이지 로드/새로고침 시 체크
    const checkPageRefresh = () => {
      const refreshFlag = sessionStorage.getItem('page_refresh');
      if (refreshFlag === 'true') {
        // 플래그 제거
        sessionStorage.removeItem('page_refresh');
        // 로그인 페이지로 리다이렉트
        navigate('/');
      }
    };

    // 페이지 로드 즉시 실행
    checkPageRefresh();

    // history stack 초기화 및 설정
    const initializeHistory = () => {
      // 현재 상태를 history stack에 추가
      window.history.pushState({ page: location.pathname }, '', location.pathname);
    };

    // history 초기화 실행
    initializeHistory();

    // 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', blockNavigation);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', blockNavigation);
    };
  }, [location.pathname, navigate]);

  return null;
};

export default NavigationBlocker;
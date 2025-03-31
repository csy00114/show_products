// main.js - 모든 카테고리 상품을 한 페이지에 로드 (최종 수정)

// 표시할 카테고리 목록 정의
const CATEGORIES = {
    goldbox: "쿠팡 골드박스",
    coupangPL: "쿠팡 PL 상품", // *** 쿠팡 PL 옵션 추가 ***
    1001: "여성패션",
    1002: "남성패션",
    1010: "뷰티",
    1011: "출산/유아동",
    1012: "식품",
    1013: "주방용품",
    1014: "생활용품",
    1015: "홈인테리어",
    1016: "가전디지털",
    1017: "스포츠/레저",
    1018: "자동차용품",
    1019: "도서/음반/DVD",
    1020: "완구/취미",
    1021: "문구/오피스",
    1024: "헬스/건강식품",
    1025: "국내여행",
    1026: "해외여행",
    1029: "반려동물용품",
    1030: "유아동패션",
};

/**
 * 개별 상품 정보를 HTML로 변환하는 함수
 * @param {object} product 상품 정보 객체
 * @returns {string} 상품 HTML 문자열
 */
function createProductHTML(product) {
    console.log("createProductHTML - product:", product); // 디버깅 로그
    // 필요한 속성 확인 강화
    if (!product || typeof product !== 'object' || !product.productUrl || !product.productImage || !product.productName) {
        console.error("createProductHTML - product 객체 또는 필수 속성이 유효하지 않습니다:", product);
        return '<div class="product" style="color: red; border: 1px dashed red; padding: 5px;">상품 정보 형식 오류</div>';
    }
    // 가격 포맷팅 및 가격 정보 없음 처리
    const priceString = product.productPrice ? product.productPrice.toLocaleString() + '원' : '가격 정보 없음';

    // target="_blank" 제거
    return `
    <div class="product">
        <a href="${product.productUrl}">
            <img src="${product.productImage}" alt="${product.productName}" style="width: 150px; height: auto; vertical-align: middle; margin-right: 10px;">
        </a>
        <div style="display: inline-block; vertical-align: middle; max-width: calc(100% - 170px);">
            <h3><a href="${product.productUrl}">${product.productName}</a></h3>
            <p>가격: ${priceString}</p>
        </div>
    </div>
    `;
}

/**
 * 모든 카테고리의 상품을 순차적으로 로드하고 표시하는 메인 함수
 */
async function loadAllCategoryProducts() {
    const mainContainer = document.getElementById('app'); // 전체 내용을 담을 컨테이너
    if (!mainContainer) {
        console.error("ID가 'app'인 요소를 찾을 수 없습니다.");
        return;
    }
    // 초기 메시지 및 상품 목록 영역 설정
    mainContainer.innerHTML = `<h1>쿠팡 파트너스 추천 상품</h1>
                             <p id="loading-message">전체 카테고리 상품을 불러오는 중...</p>
                             <div id="all-products-container"></div>`;
    const productsContainer = document.getElementById('all-products-container');

    // CATEGORIES 객체를 순회하며 각 카테고리/타입 처리
    for (const key in CATEGORIES) {
        const categoryName = CATEGORIES[key];
        let fetchUrl = "";
        let title = "";

        console.log(`[${categoryName}] 상품 로드 시작...`);

        // URL 및 제목 설정
        if (key === "coupangPL") {
            fetchUrl = `/.netlify/functions/coupang_api?type=coupangPL`;
            title = "쿠팡 PL 상품";
        } else if (key === "goldbox") {
            fetchUrl = `/.netlify/functions/coupang_api?type=goldbox`;
            title = "쿠팡 골드박스";
        } else { // 숫자 ID는 베스트 카테고리로 간주
            fetchUrl = `/.netlify/functions/coupang_api?category_id=${key}`;
            title = `${categoryName} 베스트 상품`;
        }
        console.log(` - Fetching URL: ${fetchUrl}`);

        let categorySectionHtml = `<section class="category-section" id="category-${key}"><h2>${title}</h2>`; // 각 카테고리 섹션 시작

        try {
            const response = await fetch(fetchUrl);
            console.log(` - [${categoryName}] 응답 상태:`, response.status, response.ok);

            // *** 수정된 오류 처리 및 본문 읽기 (body stream already read 오류 해결) ***
            if (!response.ok) {
                // 실패 시, 응답 본문을 텍스트로 딱 한 번만 읽음
                const errorText = await response.text();
                let errorMsg = `API 호출 실패 (${response.status})`;
                try {
                    // 읽은 텍스트를 JSON으로 파싱 시도
                    const errorData = JSON.parse(errorText);
                    // 파싱 성공 시, error 메시지 추출 또는 전체 데이터 문자열화
                    errorMsg = errorData.error || JSON.stringify(errorData);
                } catch (e) {
                    // JSON 파싱 실패 시, 그냥 읽은 텍스트 사용
                    errorMsg = errorText;
                }
                console.error(` - [${categoryName}] 오류: ${errorMsg}`);
                categorySectionHtml += `<p>상품 정보를 가져오는 데 실패했습니다 (${response.status}).</p>`;
            } else {
                // 성공 시, 응답 본문을 JSON으로 딱 한 번만 읽음
                const products = await response.json();
                console.log(` - [${categoryName}] 상품 데이터:`, products);

                if (products && Array.isArray(products)) {
                    if (products.length > 0) {
                        categorySectionHtml += `<ul style="list-style-type: none; padding-left: 0;">`;
                        for (const product of products) {
                            categorySectionHtml += `<li style="margin-bottom: 15px;">${createProductHTML(product)}</li>`;
                        }
                        categorySectionHtml += `</ul>`;
                    } else {
                        categorySectionHtml += `<p>추천 상품이 없습니다.</p>`;
                    }
                } else {
                    console.error(` - [${categoryName}] 상품 데이터 형식 오류:`, products);
                    categorySectionHtml += "<p>상품 목록 형식 오류.</p>";
                }
            }
        } catch (error) { // 네트워크 오류 등 fetch 자체 실패 시
            console.error(` - [${categoryName}] 네트워크 또는 기타 오류:`, error);
            categorySectionHtml += `<p>상품 정보를 가져오는 중 오류 발생: ${error.message}</p>`;
        }

        categorySectionHtml += `</section><hr>`; // 카테고리 섹션 끝 및 구분선
        productsContainer.insertAdjacentHTML('beforeend', categorySectionHtml); // 생성된 HTML을 순차적으로 추가
    }

    // 로딩 메시지 제거
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
        loadingMessage.remove();
    }

    // 'Top' 버튼 코드 추가
    const scrollTopButtonHtml = `
       <style>
       #scrollTopBtn { display: none; position: fixed; bottom: 20px; right: 30px; z-index: 99; border: none; outline: none; background-color: rgba(0, 0, 0, 0.5); color: white; cursor: pointer; padding: 10px 15px; border-radius: 50%; font-size: 18px; line-height: 1; }
       #scrollTopBtn:hover { background-color: rgba(0, 0, 0, 0.8); }
       </style>
       <button onclick="scrollToTop()" id="scrollTopBtn" title="맨 위로">▲</button>
       <script>
       var myBtn = document.getElementById("scrollTopBtn"); window.onscroll = function() {scrollFunc()}; function scrollFunc() { if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) { myBtn.style.display = "block"; } else { myBtn.style.display = "none"; } } function scrollToTop() { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; }
       // 스크립트 중복 실행 방지를 위해 전역 객체에 플래그 설정 (간단한 방법)
       if (typeof window.scrollTopScriptLoaded === 'undefined') {
           window.scrollTopScriptLoaded = true;
           // 스크립트 내용을 여기에 넣거나, 외부 파일로 분리 권장
       }
       </script>
       `;
    // Top 버튼은 전체 컨테이너(#app)의 끝에 추가
    if (mainContainer) {
        mainContainer.insertAdjacentHTML('beforeend', scrollTopButtonHtml);
    }
}

// 페이지 로드 완료 시 loadAllCategoryProducts 함수 실행
document.addEventListener('DOMContentLoaded', loadAllCategoryProducts);
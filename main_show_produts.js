// main.js

// 카테고리 목록에 "쿠팡 PL 상품" 옵션 추가
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
    if (!product || !product.productUrl || !product.productImage || !product.productName) {
        console.error("createProductHTML - product 객체에 필요한 속성이 없습니다:", product);
        return '<div class="product">상품 정보 오류</div>';
    }
    return `
    <div class="product">
        <a href="${product.productUrl}" target="_blank">
            <img src="${product.productImage}" alt="${product.productName}" style="width: 200px; height: auto;">
        </a>
        <h3><a href="${product.productUrl}" target="_blank">${product.productName}</a></h3>
        <p>가격: ${product.productPrice ? product.productPrice.toLocaleString() + '원' : '가격 정보 없음'}</p> </div>
    `;
}

/**
 * 카테고리(종류) 선택 드롭다운 HTML을 생성하는 함수
 * @param {object} categories 카테고리 목록 객체
 * @returns {string} 드롭다운 HTML 문자열
 */
function createCategorySelectionHTML(categories) {
    let html = `
    <label for="category">종류 선택:</label>
    <select id="category" onchange="loadSelectedProducts()">
        <option value="">선택하세요</option>
    `;
    for (const categoryId in categories) {
        html += `<option value="${categoryId}">${categories[categoryId]}</option>`;
    }
    html += `
    </select>
    <div id="products-container"></div>
    `;
    return html;
}

/**
 * 선택된 종류에 따라 Netlify Function을 호출하여 상품 목록을 로드하고 표시하는 함수
 */
async function loadSelectedProducts() {
    const selectedValue = document.getElementById("category").value;
    console.log("loadSelectedProducts - selectedValue:", selectedValue);

    const productsContainer = document.getElementById("products-container");
    productsContainer.innerHTML = ""; // 이전 상품 목록 지우기

    if (selectedValue) {
        let fetchUrl = "";
        let title = ""; // 제목 설정용 변수

        // 선택된 값에 따라 URL 및 제목 구성
        if (selectedValue === "coupangPL") {
            fetchUrl = `/.netlify/functions/coupang_api?type=coupangPL`;
            title = "쿠팡 PL 상품";
        } else if (selectedValue === "goldbox") {
            fetchUrl = `/.netlify/functions/coupang_api?type=goldbox`;
            title = "쿠팡 골드박스";
        } else {
            fetchUrl = `/.netlify/functions/coupang_api?category_id=${selectedValue}`;
            title = "베스트 상품";
        }
        console.log("loadSelectedProducts - fetchUrl:", fetchUrl);

        // 로딩 메시지 표시
        productsContainer.innerHTML = `<h2>${title}</h2><p>상품 목록을 불러오는 중...</p>`;

        try {
            const response = await fetch(fetchUrl);
            console.log("loadSelectedProducts - fetch response:", response);

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || errorText;
                } catch (parseError) { /* Ignore */ }
                throw new Error(`Netlify Function 호출 실패: ${response.status} - ${errorMessage}`);
            }

            const products = await response.json();
            console.log("loadSelectedProducts - products:", products); // 받은 products 데이터 확인

            let html = `<h2>${title}</h2>`;

            // products 배열 확인 및 처리
            if (products && Array.isArray(products)) {
                if (products.length > 0) {
                    for (const product of products) {
                        html += createProductHTML(product);
                    }
                } else {
                    // 상품 없을 때 메시지 구분
                    if (selectedValue === "coupangPL") {
                         html += "<p>쿠팡 PL 상품이 없습니다.</p>";
                    } else if (selectedValue === "goldbox") {
                        html += "<p>쿠팡 골드박스 상품이 없습니다.</p>";
                    } else {
                         html += "<p>해당 카테고리에 상품이 없습니다.</p>";
                    }
                }
            } else {
                console.error("loadSelectedProducts - products가 배열이 아니거나 null/undefined입니다:", products);
                html += "<p>상품 목록을 가져오는 중 오류가 발생했습니다.</p>";
            }

            productsContainer.innerHTML = html; // 최종 HTML 표시

        } catch (error) {
            console.error("loadSelectedProducts - error:", error);
            productsContainer.innerHTML = `<p>상품 정보를 가져오는 데 실패했습니다. 오류: ${error.message}</p>`;
        }
    }
}

/**
 * 초기화 함수: 페이지 로드 시 카테고리 선택 메뉴를 생성합니다.
 */
function init() {
    const categorySelectionHtml = createCategorySelectionHTML(CATEGORIES);
    const app = document.getElementById('app');
    if (app) { // app 요소가 있는지 확인
        app.innerHTML = `
            <h1>쿠팡 파트너스 상품</h1>
            ${categorySelectionHtml}
        `;
    } else {
        console.error("ID가 'app'인 요소를 찾을 수 없습니다.");
    }
}

// 페이지의 HTML 콘텐츠가 완전히 로드되고 파싱되었을 때 init 함수를 실행합니다.
document.addEventListener('DOMContentLoaded', init);
// netlify/functions/show_produts_api.js
// 쿠팡 파트너스 API 요청 처리 (베스트 카테고리, 쿠팡 PL, 골드박스)

const crypto = require('crypto');
const fetch = require('node-fetch'); // node-fetch v2 사용

const DOMAIN = "api-gateway.coupang.com";
const API_VERSION = "v2";
const PROVIDER = "affiliate_open_api";
const OPEN_API_VERSION = "v1";
const ACCESS_KEY = process.env.COUPANG_API_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_API_SECRET_KEY;
const PARTNERS_ID = process.env.COUPANG_PARTNERS_ID;
const SUB_ID = process.env.COUPANG_PARTNERS_SUB_ID; // 환경 변수에서 subId 가져오기

/**
 * HMAC 서명 생성 함수
 * @param {string} method HTTP 메서드 (GET, POST 등)
 * @param {string} path 요청 경로 (쿼리 스트링 제외)
 * @param {string} query 쿼리 스트링 (예: "limit=10&subId=...")
 * @param {string} secretKey 쿠팡 파트너스 Secret Key
 * @param {string} accessKey 쿠팡 파트너스 Access Key
 * @returns {string} Authorization 헤더 값
 */
function generateAuthorization(method, path, query, secretKey, accessKey) {
    const now = new Date();
    const year = String(now.getUTCFullYear()).slice(-2);
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    // 형식: YYMMDDTHHMMSSZ
    const datetime = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    console.log("generateAuthorization - datetime:", datetime); // 디버깅 로그

    // 메시지에 쿼리 스트링 포함
    const message = datetime + method + path + (query || '');
    console.log("generateAuthorization - message for HMAC:", message); // 디버깅 로그

    const signature = crypto.createHmac('sha256', secretKey)
                          .update(message)
                          .digest('hex');

    return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

/**
 * 쿠팡 골드박스 상품 조회 함수
 * @param {number} limit 가져올 상품 수 (기본값 20)
 * @returns {Promise<Array>} 상품 목록 배열 또는 빈 배열
 */
async function getGoldboxProducts(limit = 100 {
    const path = `/${API_VERSION}/providers/${PROVIDER}/apis/openapi/${OPEN_API_VERSION}/products/goldbox`; // 골드박스 엔드포인트

    let queryParams = [];
    if (limit) queryParams.push(`limit=${limit}`);
    if (SUB_ID) queryParams.push(`subId=${SUB_ID}`); // SUB_ID 확인 필요
    const queryString = queryParams.join('&');

    const url = `https://${DOMAIN}${path}?${queryString}`;
    const method = 'GET';

    const authorization = generateAuthorization(method, path, queryString, SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };

    try {
        console.log("getGoldboxProducts - url:", url);
        console.log("getGoldboxProducts - headers:", headers);
        const response = await fetch(url, { method, headers });
        console.log("getGoldboxProducts - response.status:", response.status);
        console.log("getGoldboxProducts - response.ok:", response.ok);
        console.log("getGoldboxProducts - response.headers:", response.headers);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Coupang Goldbox API Error Status: ${response.status}, Text: ${errorText}`);
            throw new Error(`Coupang Goldbox API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("Coupang Goldbox API Response:", data); // *** 중요: 실제 응답 확인 ***

        if (data && data.data && Array.isArray(data.data)) {
            return data.data;
        } else {
            console.error("Coupang Goldbox API 응답에 'data' 속성이 없거나, 비어있거나, 배열이 아닙니다:", data);
            return [];
        }
    } catch (error) {
        console.error("Error fetching Coupang Goldbox data:", error);
        if (!error.response) { console.error("Fetch error details:", error.message, error.type); }
        else if (error.response) { /* ... 상세 오류 로깅 ... */ }
        return [];
    }
}


/**
 * 쿠팡 PL 상품 조회 함수
 * @param {number} limit 가져올 상품 수 (기본값 20)
 * @param {string|null} imageSize 이미지 크기 (예: "512x512")
 * @returns {Promise<Array>} 상품 목록 배열 또는 빈 배열
 */
async function getCoupangPLProducts(limit = 20 imageSize = null) {
    const path = `/${API_VERSION}/providers/${PROVIDER}/apis/openapi/${OPEN_API_VERSION}/products/coupangPL`; // 쿠팡 PL 엔드포인트
    let queryParams = [];
    if (limit) queryParams.push(`limit=${limit}`);
    if (SUB_ID) queryParams.push(`subId=${SUB_ID}`);
    if (imageSize) queryParams.push(`imageSize=${imageSize}`);
    const queryString = queryParams.join('&');
    const url = `https://${DOMAIN}${path}?${queryString}`;
    const method = 'GET';

    const authorization = generateAuthorization(method, path, queryString, SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };

    try {
        console.log("getCoupangPLProducts - url:", url);
        console.log("getCoupangPLProducts - headers:", headers);
        const response = await fetch(url, { method, headers });
        console.log("getCoupangPLProducts - response.status:", response.status);
        console.log("getCoupangPLProducts - response.ok:", response.ok);
        console.log("getCoupangPLProducts - response.headers:", response.headers);

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`Coupang PL API Error Status: ${response.status}, Text: ${errorText}`);
             throw new Error(`Coupang PL API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("Coupang PL API Response:", data);
        if (data && data.data && Array.isArray(data.data)) {
            return data.data;
        } else {
            console.error("Coupang PL API 응답에 'data' 속성이 없거나, 비어있거나, 배열이 아닙니다:", data);
            return [];
        }
    } catch (error) {
        console.error("Error fetching Coupang PL data:", error);
        if (!error.response) { console.error("Fetch error details:", error.message, error.type); }
        else if (error.response) { /* ... 상세 오류 로깅 ... */ }
        return [];
    }
}

/**
 * 베스트 카테고리 상품 조회 함수
 * @param {string} categoryId 카테고리 ID
 * @param {number} limit 가져올 상품 수 (기본값 10)
 * @returns {Promise<Array>} 상품 목록 배열 또는 빈 배열
 */
async function getBestSellingProducts(categoryId, limit = 100) {
    const path = `/${API_VERSION}/providers/${PROVIDER}/apis/openapi/${OPEN_API_VERSION}/products/bestcategories/${categoryId}`; // 베스트 카테고리 엔드포인트
    let queryParams = [];
    if (limit) queryParams.push(`limit=${limit}`);
    if (SUB_ID) queryParams.push(`subId=${SUB_ID}`);
    const queryString = queryParams.join('&');
    const url = `https://${DOMAIN}${path}?${queryString}`;
    const method = 'GET';

    const authorization = generateAuthorization(method, path, queryString, SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };

    try {
        console.log("getBestSellingProducts - url:", url);
        console.log("getBestSellingProducts - headers:", headers);
        const response = await fetch(url, { method, headers });
        console.log("getBestSellingProducts - response.status:", response.status);
        console.log("getBestSellingProducts - response.ok:", response.ok);
        console.log("getBestSellingProducts - response.headers:", response.headers);

        const data = await response.json();
        console.log("Coupang API Response (Best Categories):", data);
        if (data && data.data && Array.isArray(data.data)) {
            return data.data;
        } else {
            console.error("Coupang API 응답(Best Categories)에 'data' 속성이 없거나, 비어있거나, 배열이 아닙니다:", data);
            return [];
        }
    } catch (error) {
        console.error("Error fetching data from Coupang API (Best Categories):", error);
        if (error.response) { /* ... 상세 오류 로깅 ... */ }
        return [];
    }
}

/**
 * 딥링크 생성 함수
 * @param {Array<string>} coupangUrls 원본 쿠팡 URL 배열
 * @returns {Promise<Array>} 딥링크 정보 배열 또는 빈 배열
 */
async function generateDeeplink(coupangUrls) {
    const path = `/${API_VERSION}/links`;
    const url = `https://${DOMAIN}${path}`;
    const method = 'POST';

    // POST 요청은 일반적으로 path만 사용, 빈 query 전달
    const authorization = generateAuthorization(method, path, '', SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };
    const data = { // subId를 data에 추가
        coupangUrls: coupangUrls,
        subId: SUB_ID
    };

    try {
        console.log("generateDeeplink - url:", url);
        console.log("generateDeeplink - headers:", headers);
        console.log("generateDeeplink - data:", data);
        const response = await fetch(url, { method, headers, body: JSON.stringify(data) });
        console.log("generateDeeplink - response.status:", response.status);
        console.log("generateDeeplink - response.ok:", response.ok);
        const result = await response.json();
        console.log("Coupang API Deeplink Response:", result);
        if (result && result.data && Array.isArray(result.data)) {
            return result.data;
        }
        else{
          console.error("Coupang API Deeplink Response에 'data'속성이 없거나, 비어있거나, 배열이 아닙니다.:", result);
          return [];
        }
    } catch (error) {
        console.error("Error generating deeplink:", error);
        if (error.response) { /* ... 상세 오류 로깅 ... */ }
        return [];
    }
}


/**
 * Netlify Function 핸들러
 * 요청 파라미터에 따라 적절한 상품 조회 함수를 호출하고 결과를 반환합니다.
 */
exports.handler = async (event, context) => {
    const { httpMethod } = event;
    const { category_id, type, limit, imageSize } = event.queryStringParameters;

    // GET 요청만 처리
    if (httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let products = [];
    try {
        // 파라미터에 따라 상품 조회 함수 분기
        if (type === 'coupangPL') {
            console.log("Handler: Fetching Coupang PL products");
            products = await getCoupangPLProducts(limit, imageSize);
        } else if (type === 'goldbox') {
            console.log("Handler: Fetching Goldbox products");
            products = await getGoldboxProducts(limit);
        } else if (category_id) {
            console.log("Handler: Fetching Best Category products for", category_id);
            products = await getBestSellingProducts(category_id, limit);
        } else {
             console.log("Handler: Invalid parameters");
            return {
                statusCode: 400,
                body: JSON.stringify({ error: '`type=coupangPL`, `type=goldbox` 또는 `category_id` 파라미터가 필요합니다.' }),
            };
        }

         // 상품 목록이 비어있으면 빈 배열 반환
        if (!products || products.length === 0) {
             console.log("Handler: No products found, returning empty array.");
             return { statusCode: 200, body: JSON.stringify([]) };
        }


        // 딥링크 생성
        console.log("Handler: Generating deeplinks for", products.length, "products");
        const productUrls = products.map(product => product.productUrl);
        const deeplinks = await generateDeeplink(productUrls);

        // 딥링크 생성 실패 또는 빈 배열 반환 시 원본 URL 사용
        if (!deeplinks || deeplinks.length === 0) {
            console.warn("Handler: Deeplinks generation failed or returned empty. Returning original product URLs.");
            return { statusCode: 200, body: JSON.stringify(products) };
        }

        // 딥링크 적용
        console.log("Handler: Applying deeplinks");
        const deeplinkMap = {};
        deeplinks.forEach(link => {
            if (link.originalUrl && link.shortenUrl) {
                 deeplinkMap[link.originalUrl] = link.shortenUrl;
            }
        });

        const updatedProducts = products.map(product => ({
            ...product,
            productUrl: deeplinkMap[product.productUrl] || product.productUrl,
        }));

        console.log("Handler: Returning", updatedProducts.length, "products with deeplinks");
        return { statusCode: 200, body: JSON.stringify(updatedProducts) };

    } catch (error) {
        // 핸들러 내 전반적인 오류 처리
        console.error("Error in exports.handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
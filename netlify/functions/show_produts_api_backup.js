// netlify/functions/coupang_api.js

const crypto = require('crypto');
const fetch = require('node-fetch'); // node-fetch v2 사용

const DOMAIN = "api-gateway.coupang.com";
const API_VERSION = "v2";
const PROVIDER = "affiliate_open_api";
const OPEN_API_VERSION = "v1";
const ACCESS_KEY = process.env.COUPANG_API_ACCESS_KEY;
const SECRET_KEY = process.env.COUPANG_API_SECRET_KEY;
const PARTNERS_ID = process.env.COUPANG_PARTNERS_ID;
const SUB_ID = process.env.COUPANG_PARTNERS_SUB_ID;

// *** 수정된 HMAC 서명 생성 함수 (Query String 포함) ***
function generateAuthorization(method, path, query, secretKey, accessKey) { // query 파라미터 추가
    const now = new Date();
    const year = String(now.getUTCFullYear()).slice(-2);
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');

    // 형식: YYMMDDTHHMMSSZ
    const datetime = `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    console.log("generateAuthorization - datetime:", datetime);

    // *** 수정: Query String 포함 ***
    const message = datetime + method + path + (query || ''); // query가 있으면 포함, 없으면 빈 문자열
    console.log("generateAuthorization - message for HMAC:", message); // 서명에 사용될 전체 메시지 로깅

    const signature = crypto.createHmac('sha256', secretKey)
                          .update(message)
                          .digest('hex');

    return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

// getCoupangPLProducts 함수 (generateAuthorization 호출 수정)
async function getCoupangPLProducts(limit = 20, imageSize = null) {
    const path = `/${API_VERSION}/providers/${PROVIDER}/apis/openapi/${OPEN_API_VERSION}/products/coupangPL`;

    let queryParams = [];
    if (limit) queryParams.push(`limit=${limit}`);
    if (SUB_ID) queryParams.push(`subId=${SUB_ID}`);
    if (imageSize) queryParams.push(`imageSize=${imageSize}`);
    const queryString = queryParams.join('&'); // Query String 생성

    const url = `https://${DOMAIN}${path}?${queryString}`;
    const method = 'GET';

    // *** 수정: queryString 전달 ***
    const authorization = generateAuthorization(method, path, queryString, SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };

    try {
        console.log("getCoupangPLProducts - url:", url);
        console.log("getCoupangPLProducts - headers:", headers); // Authorization 헤더 값 확인
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
        // ... (기존 오류 로깅) ...
        return [];
    }
}

// getBestSellingProducts 함수 (generateAuthorization 호출 수정)
async function getBestSellingProducts(categoryId, limit = 100) {
    const path = `/${API_VERSION}/providers/${PROVIDER}/apis/openapi/${OPEN_API_VERSION}/products/bestcategories/${categoryId}`;

    let queryParams = []; // Query String 생성 시작
    if (limit) queryParams.push(`limit=${limit}`);
    if (SUB_ID) queryParams.push(`subId=${SUB_ID}`);
    const queryString = queryParams.join('&'); // Query String 생성 완료

    const url = `https://${DOMAIN}${path}?${queryString}`;
    const method = 'GET';

    // *** 수정: queryString 전달 ***
    const authorization = generateAuthorization(method, path, queryString, SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };

    try {
        console.log("getBestSellingProducts - url:", url);
        console.log("getBestSellingProducts - headers:", headers); // Authorization 헤더 값 확인
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
        if (error.response) {
           // ... (기존 오류 로깅) ...
        }
        return [];
    }
}

// generateDeeplink 함수 (generateAuthorization 호출 수정)
async function generateDeeplink(coupangUrls) {
    const path = `/${API_VERSION}/links`;
    const url = `https://${DOMAIN}${path}`;
    const method = 'POST';

    // *** 수정: POST 요청은 일반적으로 path만 사용, 빈 query 전달 ***
    const authorization = generateAuthorization(method, path, '', SECRET_KEY, ACCESS_KEY);
    const headers = {
        'Authorization': authorization,
        'Content-Type': 'application/json;charset=UTF-8'
    };
    const data = {
        coupangUrls: coupangUrls,
        subId: SUB_ID
    };

    try {
        console.log("generateDeeplink - url:", url);
        console.log("generateDeeplink - headers:", headers); // Authorization 헤더 값 확인
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
        if (error.response) {
           // ... (기존 오류 로깅) ...
        }
        return [];
    }
}


// exports.handler 함수 (내용 동일)
exports.handler = async (event, context) => {
    const { httpMethod } = event;
    const { category_id, type, limit, imageSize } = event.queryStringParameters;

    if (httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let products = [];
    try {
        if (type === 'coupangPL') {
            products = await getCoupangPLProducts(limit, imageSize);
        } else if (category_id) {
            products = await getBestSellingProducts(category_id, limit);
        } else {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: '`type=coupangPL` 또는 `category_id` 파라미터가 필요합니다.' }),
            };
        }

        if (!products || products.length === 0) {
             return { statusCode: 200, body: JSON.stringify([]) };
        }

        const productUrls = products.map(product => product.productUrl);
        const deeplinks = await generateDeeplink(productUrls);

        if (!deeplinks || deeplinks.length === 0) {
            console.warn("Deeplinks generation failed. Returning original product URLs.");
            return { statusCode: 200, body: JSON.stringify(products) };
        }

        const deeplinkMap = {};
        deeplinks.forEach(link => {
            deeplinkMap[link.originalUrl] = link.shortenUrl;
        });

        const updatedProducts = products.map(product => ({
            ...product,
            productUrl: deeplinkMap[product.productUrl] || product.productUrl,
        }));

        return { statusCode: 200, body: JSON.stringify(updatedProducts) };

    } catch (error) {
        console.error("Error in exports.handler:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
    }
};
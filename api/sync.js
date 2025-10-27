// api/sync.js

// 1. Usa la sintaxis de importación moderna para Node.js (requiere que node-fetch esté instalado)
import fetch from 'node-fetch'; // <--- CAMBIO CLAVE

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { targetUrl } = request.body;
        
        if (!targetUrl) {
            return response.status(400).json({ error: 'Missing targetUrl in request body' });
        }
        
        // 2. Realizar la solicitud al Google Apps Script desde el servidor de Vercel
        const gasResponse = await fetch(targetUrl, { // <--- 'fetch' funciona sin require()
            method: 'GET', 
        });

        // 3. Obtener el texto de la respuesta del Google Script
        const gasText = await gasResponse.text();

        if (!gasResponse.ok) {
            console.error('GAS Error Response:', gasText);
            return response.status(gasResponse.status).send(gasText);
        }

        // 4. Intentar parsear como JSON y devolverlo
        try {
            const gasJson = JSON.parse(gasText);
            response.setHeader('Content-Type', 'application/json');
            return response.status(200).json(gasJson);
        } catch (jsonError) {
            console.error('GAS returned non-JSON data:', gasText);
            return response.status(500).json({ error: 'Google Apps Script did not return valid JSON.', rawResponse: gasText.substring(0, 100) + '...' });
        }

    } catch (error) {
        console.error('Vercel Proxy Error:', error);
        return response.status(500).json({ error: 'Internal Server Error in Vercel Proxy.', details: error.message });
    }
}

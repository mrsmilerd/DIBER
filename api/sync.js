// api/sync.js

// 1. Importación estática de 'node-fetch' (requiere que el paquete esté instalado con npm)
// Nota: Para compatibilidad con CommonJS en algunos entornos Vercel/Node.js, se usa require.
const fetch = require('node-fetch');

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Extraer la URL de Google Script que te envió el frontend
        const { targetUrl } = request.body;
        
        if (!targetUrl) {
            return response.status(400).json({ error: 'Missing targetUrl in request body' });
        }
        
        // 2. Realizar la solicitud al Google Apps Script desde el servidor de Vercel
        // Usamos la importación corregida (fetch)
        const gasResponse = await fetch(targetUrl, {
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
        // Si hay otro error, devolvemos un mensaje de error interno
        return response.status(500).json({ error: 'Internal Server Error in Vercel Proxy.', details: error.message });
    }
}

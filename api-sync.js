// api/sync.js

// Esta es la Vercel Serverless Function que resolverá el problema de CORS y el error de JSON.

// Para entornos de Vercel, node-fetch se puede importar dinámicamente.
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
        const fetch = (await import('node-fetch')).default;
        const gasResponse = await fetch(targetUrl, {
            method: 'GET', 
            // Vercel Server actúa como un intermediario seguro
        });

        // 3. Obtener el texto de la respuesta del Google Script
        const gasText = await gasResponse.text();

        if (!gasResponse.ok) {
            // Si el Google Script devuelve un error, lo pasamos al cliente
            console.error('GAS Error Response:', gasText);
            return response.status(gasResponse.status).send(gasText);
        }

        // 4. Intentar parsear como JSON y devolverlo
        try {
            const gasJson = JSON.parse(gasText);
            response.setHeader('Content-Type', 'application/json');
            return response.status(200).json(gasJson);
        } catch (jsonError) {
            // Si el GAS devolvió algo que no es JSON (el error original)
            console.error('GAS returned non-JSON data:', gasText);
            return response.status(500).json({ error: 'Google Apps Script did not return valid JSON.', rawResponse: gasText.substring(0, 100) + '...' });
        }

    } catch (error) {
        console.error('Vercel Proxy Error:', error);
        return response.status(500).json({ error: 'Internal Server Error in Vercel Proxy.', details: error.message });
    }
}
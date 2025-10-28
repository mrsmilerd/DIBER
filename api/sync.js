// /api/sync.js - Proxy para Google Apps Script
export default async function handler(req, res) {
  // Habilitar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { targetUrl } = req.body;
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl es requerido' });
    }

    console.log('🔗 Proxy recibió targetUrl:', targetUrl);

    // Hacer la request a Google Apps Script
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.text();
    console.log('✅ Proxy respuesta exitosa');

    // Intentar parsear como JSON
    try {
      const jsonData = JSON.parse(data);
      res.status(200).json(jsonData);
    } catch (parseError) {
      // Si no es JSON, devolver como texto
      res.status(200).json({ success: true, rawResponse: data });
    }

  } catch (error) {
    console.error('❌ Error en proxy:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Error en el proxy de Vercel' 
    });
  }
}

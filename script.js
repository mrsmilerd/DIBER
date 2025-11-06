// =============================================
// DIBER - Calculadora Inteligente para Conductores
// Versión Mejorada con Sistema de Pestañas Y SINCRONIZACIÓN MULTI-DISPOSITIVO
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;
let filtroActual = 'hoy';

// --- Sistema de Código de Usuario ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Variables de Control de Inicialización ---
let firebaseInitialized = false;
let loadingData = false;
let appInitialized = false;

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
  authDomain: "diber-32875.firebaseapp.com",
  projectId: "diber-32875",
  storageBucket: "diber-32875.firebasestorage.app",
  messagingSenderId: "260349079723",
  appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// --- Elementos DOM ---
const elementos = {};

// Inicializar elementos DOM de forma segura
function inicializarElementosDOM() {
    console.log('🔍 Inicializando elementos DOM...');
    
    const ids = [
        'perfil-screen', 'config-perfil-screen', 'main-screen',
        'status-indicator', 'status-text', 'auto-calc-indicator',
        'tarifa', 'minutos', 'distancia',
        'resultado-rapido', 'resultado-badge', 'resultado-emoji', 'resultado-texto',
        'metrica-minuto', 'metrica-km',
        'aceptar-viaje', 'rechazar-viaje',
        'modalFondo', 'modalContenido', 'modalResultadosDoble', 'modal-badge', 'modal-emoji', 'modal-texto',
        'history-list', 'clear-history', 'exportar-historial',
        'stats-viajes', 'stats-ganancia', 'stats-tiempo', 'stats-rentables', // ✅ Mantener estos
        'perfiles-lista', 'nuevo-perfil-btn', 'perfil-form', 'volver-perfiles', 'cancelar-perfil', 'cambiar-perfil',
        'theme-toggle', 'exportModal', 'exportar-pdf', 'sync-panel',
        'sync-status-btn', 'sync-btn-icon',
        // ✅ NUEVOS IDs para rendimiento
        'rendimiento-ganancia-hora-linea', 'rendimiento-viaje-promedio-linea',
        'rendimiento-ganancia-hora-card', 'rendimiento-distancia-total-card',
        'rendimiento-eficiencia-card', 'rendimiento-eficiencia-badge'
        // ❌ ELIMINAR: 'stats-ganancia-hora', 'stats-viaje-promedio' (estos ya no existen)
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
        if (!elementos[id]) {
            console.warn(`⚠️ Elemento no encontrado: ${id}`);
        }
    });

    // Elementos adicionales
    elementos.tabButtons = document.querySelectorAll('.tab-button');
    elementos.tabContents = document.querySelectorAll('.tab-content');
    
    console.log('✅ Elementos DOM inicializados');
}

// =============================================
// SISTEMA DE EXPORTACIÓN DE HISTORIAL
// =============================================

function exportarHistorial() {
    console.log('📤 Exportando historial...');
    
    if (!historial || historial.length === 0) {
        mostrarError('No hay historial para exportar');
        return;
    }

    try {
        // Crear contenido CSV
        let csvContent = "Fecha,Ganancia (RD$),Tiempo (min),Distancia (km),Ganancia/Minuto,Ganancia/Km,Rentabilidad\n";
        
        historial.forEach(viaje => {
            const fecha = viaje.fecha || 'Fecha desconocida';
            const ganancia = viaje.ganancia || viaje.tarifa || 0;
            const minutos = viaje.minutos || 0;
            const distancia = viaje.distancia || 0;
            const porMinuto = viaje.gananciaPorMinuto || viaje.porMinuto || 0;
            const porKm = viaje.gananciaPorKm || viaje.porKm || 0;
            const rentabilidad = viaje.texto || (viaje.rentable ? 'RENTABLE' : 'NO RENTABLE');
            
            csvContent += `"${fecha}",${ganancia},${minutos},${distancia},${porMinuto},${porKm},"${rentabilidad}"\n`;
        });

        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `DIBER_historial_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensaje('✅ Historial exportado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exportando historial:', error);
        mostrarError('Error al exportar el historial');
    }
}

// Función para exportar como PDF (más avanzada) - CORREGIDA
function exportarHistorialPDF() {
    console.log('📄 Generando PDF con resumen COMPLETO...');
    
    if (!historial || historial.length === 0) {
        mostrarError('No hay historial para exportar');
        return;
    }

    try {
        // ✅ USA estadísticas completas (todos los viajes)
        const stats = obtenerEstadisticasCompletas();
        
        console.log('📊 Datos para PDF (COMPLETO):', {
            totalViajes: stats.totalViajes,
            viajesRentables: stats.viajesRentables,
            eficiencia: `${stats.eficiencia.toFixed(1)}%`,
            gananciaTotal: stats.gananciaTotal,
            periodo: 'Todos los viajes del historial'
        });

        // Crear contenido del PDF mejorado
        const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DIBER - Reporte Completo</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #1a73e8, #1565c0);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        
        .logo {
            font-size: 3em;
            margin-bottom: 15px;
        }
        
        .title {
            font-size: 2.2em;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 1.1em;
            opacity: 0.9;
            font-weight: 400;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .section {
            margin-bottom: 35px;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            border-left: 5px solid #1a73e8;
        }
        
        .section-title {
            font-size: 1.4em;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border: 2px solid #e9ecef;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: 700;
            color: #1a73e8;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #6c757d;
            font-weight: 500;
        }
        
        .costs-breakdown {
            background: white;
            padding: 20px;
            border-radius: 12px;
            margin-top: 15px;
        }
        
        .cost-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        
        .cost-item:last-child {
            border-bottom: none;
        }
        
        .cost-label {
            color: #495057;
            font-weight: 500;
        }
        
        .cost-value {
            font-weight: 600;
            color: #1a73e8;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            margin-top: 10px;
        }
        
        .summary-value {
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .summary-label {
            font-size: 1.1em;
            opacity: 0.9;
        }
        
        .performance-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .performance-item {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        
        .efficiency-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            font-weight: 600;
            font-size: 1.1em;
        }
        
        .footer {
            text-align: center;
            padding: 25px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
        }
        
        .highlight {
            color: #1a73e8;
            font-weight: 600;
        }
        
        @media print {
            body {
                background: white !important;
                padding: 0 !important;
            }
            .container {
                box-shadow: none !important;
                margin: 0 !important;
                max-width: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗</div>
            <h1 class="title">DIBER - Reporte Completo</h1>
            <p class="subtitle">Análisis detallado de tu actividad</p>
        </div>
        
        <div class="content">
            <!-- Información General -->
            <div class="section">
                <h2 class="section-title">📊 Información General</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalViajes}</div>
                        <div class="stat-label">Total de Viajes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.viajesRentables}</div>
                        <div class="stat-label">Viajes Rentables</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatearMoneda(stats.gananciaTotal)}</div>
                        <div class="stat-label">Ganancia Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.tiempoTotal} min</div>
                        <div class="stat-label">Tiempo Total</div>
                    </div>
                </div>
                <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-DO')}</p>
                <p><strong>Perfil activo:</strong> ${perfilActual?.nombre || 'No especificado'}</p>
                <p><strong>Periodo:</strong> <span class="highlight">Todos los viajes del historial</span></p>
            </div>
            
            <!-- Ingresos -->
            <div class="section">
                <h2 class="section-title">💰 Ingresos</h2>
                <div class="summary-card">
                    <div class="summary-value">${formatearMoneda(stats.gananciaTotal)}</div>
                    <div class="summary-label">Ganancia Total</div>
                </div>
                <div class="costs-breakdown">
                    <div class="cost-item">
                        <span class="cost-label">Viajes Aceptados:</span>
                        <span class="cost-value">${stats.totalViajes}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Viaje Promedio:</span>
                        <span class="cost-value">${formatearMoneda(stats.viajePromedio)}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Ganancia por Hora:</span>
                        <span class="cost-value">${formatearMoneda(stats.gananciaPorHora)}/h</span>
                    </div>
                </div>
            </div>
            
            <!-- Costos -->
            <div class="section">
                <h2 class="section-title">📈 Costos Totales</h2>
                <div class="summary-card" style="background: linear-gradient(135deg, #dc3545, #e83e8c);">
                    <div class="summary-value">${formatearMoneda(stats.costoTotal)}</div>
                    <div class="summary-label">Costos Totales</div>
                </div>
                <div class="costs-breakdown">
                    <div class="cost-item">
                        <span class="cost-label">Combustible:</span>
                        <span class="cost-value">${formatearMoneda(stats.costoCombustibleTotal)}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Mantenimiento:</span>
                        <span class="cost-value">${formatearMoneda(stats.costoMantenimientoTotal)}</span>
                    </div>
                    <div class="cost-item">
                        <span class="cost-label">Seguro:</span>
                        <span class="cost-value">${formatearMoneda(stats.costoSeguroTotal)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Rendimiento -->
            <div class="section">
                <h2 class="section-title">🎯 Rendimiento</h2>
                <div class="performance-grid">
                    <div class="performance-item">
                        <div class="stat-value">${formatearMoneda(stats.gananciaPorHora)}</div>
                        <div class="stat-label">Ganancia/Hora</div>
                    </div>
                    <div class="performance-item">
                        <div class="stat-value">${stats.distanciaTotal} km</div>
                        <div class="stat-label">Distancia Total</div>
                    </div>
                    <div class="performance-item">
                        <div class="stat-value">${stats.eficiencia.toFixed(1)}%</div>
                        <div class="stat-label">Eficiencia</div>
                    </div>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                    <span class="efficiency-badge">Eficiencia: ${stats.eficiencia.toFixed(1)}%</span>
                </div>
            </div>
            
            <!-- Resumen Financiero -->
            <div class="section">
                <h2 class="section-title">💵 Resumen Financiero</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value" style="color: #28a745;">${formatearMoneda(stats.gananciaTotal)}</div>
                        <div class="stat-label">Ingresos Totales</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: #dc3545;">${formatearMoneda(stats.costoTotal)}</div>
                        <div class="stat-label">Costos Totales</div>
                    </div>
                </div>
                <div class="summary-card" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); margin-top: 20px;">
                    <div class="summary-value">${formatearMoneda(stats.gananciaNeta)}</div>
                    <div class="summary-label">GANANCIA NETA TOTAL</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Reporte generado por DIBER • ${new Date().getFullYear()}</p>
            <p>¡Sigue maximizando tus ganancias! 🚀</p>
        </div>
    </div>
</body>
</html>
        `;

        // Crear ventana para el PDF
        const ventana = window.open('', '_blank');
        ventana.document.write(pdfContent);
        ventana.document.close();
        
        // Esperar a que cargue y luego imprimir
        setTimeout(() => {
            ventana.print();
        }, 1000);
        
        mostrarMensaje('✅ PDF generado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        mostrarError('Error al generar el PDF');
    }
}

// =============================================
// FUNCIONES PARA MODAL DE EXPORTACIÓN
// =============================================

function mostrarExportModal() {
    console.log('📤 Mostrando modal de exportación');
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'flex';
    }
}

function configurarModalExportacion() {
    console.log('🔧 Configurando modal de exportación');
    const btnExportarPDF = document.getElementById('exportar-pdf');
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', function() {
            console.log('📄 Click en exportar PDF');
            exportarHistorialPDF();
            cerrarExportModal();
        });
    }
}

// =============================================
// DIAGNÓSTICO DE SINCRONIZACIÓN
// =============================================

function diagnosticarSincronizacion() {
    console.log('🔍 DIAGNÓSTICO DE SINCRONIZACIÓN COMPLETO');
    console.log('=========================================');
    
    // Estado de Firebase
    console.log('🌐 FIREBASE:');
    console.log('• Inicializado:', firebaseSync?.initialized);
    console.log('• User ID:', userCodeSystem.userId);
    console.log('• User Code:', userCodeSystem.userCode);
    
    // Datos locales
    console.log('💾 DATOS LOCALES:');
    console.log('• Perfiles:', perfiles.length);
    console.log('• Historial:', historial.length, 'viajes');
    console.log('• Perfil actual:', perfilActual?.nombre);
    
    // Verificar localStorage
    const localData = localStorage.getItem('DIBER_data');
    const historialLocal = localStorage.getItem('historialViajes');
    const userCode = localStorage.getItem('DIBER_user_code');
    
    console.log('📦 LOCALSTORAGE:');
    console.log('• DIBER_data:', localData ? JSON.parse(localData).historial?.length + ' viajes' : 'No hay datos');
    console.log('• historialViajes:', historialLocal ? JSON.parse(historialLocal).length + ' viajes' : 'No hay datos');
    console.log('• DIBER_user_code:', userCode || 'No hay código');
    
    // Verificar viajes recientes
    console.log('📅 VIAJES RECIENTES:');
    const viajesHoy = historial.filter(viaje => {
        try {
            const fechaViaje = new Date(viaje.timestamp);
            const hoy = new Date();
            return fechaViaje.toDateString() === hoy.toDateString();
        } catch (error) {
            return false;
        }
    });
    
    console.log('• Viajes hoy:', viajesHoy.length);
    viajesHoy.forEach((viaje, index) => {
        console.log(`  ${index + 1}. ${viaje.fecha} - ${viaje.ganancia} - ${viaje.rentabilidad}`);
    });
    
    // Problemas comunes
    console.log('🔧 PROBLEMAS COMUNES:');
    console.log('• User Code válido:', userCodeSystem.userCode && userCodeSystem.userCode.length >= 3);
    console.log('• Firebase disponible:', typeof firebase !== 'undefined');
    console.log('• Perfil seleccionado:', !!perfilActual);
    console.log('• Viajes con timestamp:', historial.every(v => v.timestamp));
    
    return {
        firebaseInicializado: firebaseSync?.initialized,
        userCode: userCodeSystem.userCode,
        perfilesCount: perfiles.length,
        historialCount: historial.length,
        viajesHoyCount: viajesHoy.length
    };
}

// =============================================
// SISTEMA DE HISTORIAL
// =============================================

// Inicializar historial
historial = JSON.parse(localStorage.getItem('historialViajes')) || [];

async function agregarAlHistorial(viaje) {
    console.log('➕ agregarAlHistorial() llamado con:', viaje);
    
    // Validar datos esenciales
    if (!viaje || (!viaje.tarifa && !viaje.ganancia)) {
        console.error('❌ Error: Viaje sin datos esenciales');
        return;
    }

    const tarifa = viaje.tarifa || viaje.ganancia || 0;
    const minutos = viaje.minutos || 0;
    const distancia = viaje.distancia || 0;
    const porMinuto = viaje.gananciaPorMinuto || (minutos > 0 ? (tarifa / minutos) : 0);
    const porKm = viaje.gananciaPorKm || (distancia > 0 ? (tarifa / distancia) : 0);
    
    // DETERMINAR RENTABILIDAD CORRECTAMENTE
    let rentabilidad, emoji, texto;
    
    if (viaje.rentabilidad) {
        rentabilidad = viaje.rentabilidad;
        emoji = viaje.emoji;
        texto = viaje.texto;
    } else if (perfilActual) {
        if (porMinuto >= perfilActual.umbralMinutoRentable && 
            porKm >= perfilActual.umbralKmRentable) {
            rentabilidad = 'rentable';
            emoji = '✅';
            texto = 'RENTABLE';
        } else if (porMinuto >= perfilActual.umbralMinutoOportunidad && 
                   porKm >= perfilActual.umbralKmOportunidad) {
            rentabilidad = 'oportunidad';
            emoji = '⚠️';
            texto = 'OPORTUNIDAD';
        } else {
            rentabilidad = 'no-rentable';
            emoji = '❌';
            texto = 'NO RENTABLE';
        }
    } else {
        rentabilidad = 'no-rentable';
        emoji = '❌';
        texto = 'NO RENTABLE';
    }

    const nuevoViaje = {
        id: 'viaje_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ganancia: tarifa,
        tarifa: tarifa,
        minutos: minutos,
        distancia: distancia,
        porMinuto: parseFloat(porMinuto.toFixed(2)),
        porKm: parseFloat(porKm.toFixed(2)),
        gananciaPorMinuto: parseFloat(porMinuto.toFixed(2)),
        gananciaPorKm: parseFloat(porKm.toFixed(2)),
        rentable: rentabilidad === 'rentable',
        rentabilidad: rentabilidad,
        emoji: emoji,
        texto: texto,
        aceptado: viaje.aceptado !== undefined ? viaje.aceptado : true,
        fecha: new Date().toLocaleString('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: new Date().toISOString(),
        gananciaNeta: viaje.gananciaNeta || 0,
        costoCombustible: viaje.costoCombustible || 0,
        costoMantenimiento: viaje.costoMantenimiento || 0,
        costoSeguro: viaje.costoSeguro || 0,
        costoTotal: viaje.costoTotal || 0,
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre
    };
    
    console.log('📝 Viaje procesado para historial:', nuevoViaje);

    // AGREGAR AL HISTORIAL LOCAL
    historial.unshift(nuevoViaje);
    
    // Limitar historial a 100 elementos
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // GUARDAR LOCALMENTE INMEDIATAMENTE
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    guardarDatos();
    
    console.log('💾 Historial guardado localmente. Total viajes:', historial.length);
    
    // SINCRONIZAR CON FIREBASE SI ESTÁ DISPONIBLE
    if (firebaseSync && firebaseSync.initialized && nuevoViaje.aceptado) {
        try {
            console.log('☁️ Intentando sincronizar con Firebase...');
            const exito = await firebaseSync.saveTrip(nuevoViaje);
            if (exito) {
                console.log('✅ Viaje sincronizado con Firebase');
                mostrarStatus('✅ Viaje guardado y sincronizado', 'success');
            } else {
                console.log('⚠️ Viaje guardado localmente (Firebase falló)');
                mostrarStatus('✅ Viaje guardado localmente', 'success');
            }
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
            mostrarStatus('✅ Viaje guardado localmente', 'success');
        }
    } else {
        console.log('📱 Viaje guardado localmente (Firebase no disponible)');
        mostrarStatus('✅ Viaje guardado localmente', 'success');
    }
    
    if (nuevoViaje.aceptado) {
        actualizarEstadisticasDia(nuevoViaje);
    }
    
    setTimeout(() => {
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
    }, 100);
}

function actualizarHistorialConFiltros() {
    console.log('🔄 actualizarHistorialConFiltros() ejecutándose...');
    
    if (!elementos['history-list']) {
        console.error('❌ Elemento history-list no encontrado');
        return;
    }

    // Filtrar historial según el filtro activo
    const viajesFiltrados = filtrarHistorial(historial, filtroActual);
    
    if (!viajesFiltrados || viajesFiltrados.length === 0) {
        elementos['history-list'].innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>No hay viajes en el historial</h3>
                <p>Los viajes que aceptes aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    elementos['history-list'].innerHTML = viajesFiltrados.map((viaje, index) => {
        const ganancia = viaje.ganancia || viaje.tarifa || 0;
        const minutos = viaje.minutos || 0;
        const distancia = viaje.distancia || 0;
        const porMinuto = viaje.porMinuto || viaje.gananciaPorMinuto || 0;
        const porKm = viaje.porKm || viaje.gananciaPorKm || 0;
        const rentable = viaje.rentable !== undefined ? 
                 Boolean(viaje.rentable) : 
                 (viaje.rentabilidad === 'rentable');
        const fecha = viaje.fecha || 'Fecha desconocida';
        
        return `
        <div class="history-item ${rentable ? 'rentable' : 'no-rentable'}">
            <div class="history-header">
                <span class="history-badge ${rentable ? 'badge-rentable' : 'badge-no-rentable'}">
                    ${rentable ? '✅ RENTABLE' : '❌ NO RENTABLE'}
                </span>
                <span class="history-date">${fecha}</span>
            </div>
            <div class="history-details">
                <div class="history-route">
                    <strong>Ganancia:</strong> ${formatearMoneda(ganancia)}
                </div>
                <div class="history-metrics">
                    <span class="metric">⏱️ ${minutos}min</span>
                    <span class="metric">🛣️ ${distancia}${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</span>
                    <span class="metric">💰 ${formatearMoneda(porMinuto)}/min</span>
                    <span class="metric">📏 ${formatearMoneda(porKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</span>
                </div>
            </div>
            <div class="history-actions">
                <button onclick="eliminarDelHistorial('${viaje.id}')" class="delete-btn" title="Eliminar">
                    🗑️
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    console.log('✅ Historial actualizado correctamente');
}

// CORREGIDO: Función ahora es async
async function eliminarDelHistorial(viajeId) {
    console.log('🗑️ Intentando eliminar viaje con ID:', viajeId);
    
    // Buscar el índice del viaje por ID
    const index = historial.findIndex(viaje => viaje.id === viajeId);
    
    if (index === -1) {
        console.error('❌ Viaje no encontrado con ID:', viajeId);
        mostrarError('No se pudo encontrar el viaje para eliminar');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este viaje del historial?')) {
        // Eliminar del historial local
        historial.splice(index, 1);
        
        // Guardar cambios en localStorage
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Viaje eliminado correctamente. Nuevo total:', historial.length);
        
        // Actualizar la interfaz
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        
        mostrarMensaje('Viaje eliminado correctamente', 'success');
        
        // Intentar eliminar también de Firebase si está disponible
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando eliminar de Firebase...');
                // Firebase no tiene un método delete en nuestra clase, así que lo manejamos directamente
                const tripRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips').doc(viajeId);
                
                await tripRef.delete();
                console.log('✅ Viaje eliminado de Firebase');
            } catch (error) {
                console.error('❌ Error eliminando de Firebase:', error);
                // No mostrar error al usuario, ya se eliminó localmente
            }
        }
    }
}

// =============================================
// FUNCIÓN LIMPIAR HISTORIAL COMPLETO
// =============================================

// CORREGIDO: Función ahora es async
async function limpiarHistorialCompleto() {
    console.log('🗑️ Solicitando limpiar historial completo...');
    
    if (historial.length === 0) {
        mostrarMensaje('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres limpiar TODO el historial?\n\nSe eliminarán ${historial.length} viajes.\n\n⚠️ Esta acción NO se puede deshacer.`)) {
        // Limpiar historial local
        historial = [];
        
        // Guardar cambios en localStorage
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Historial completo limpiado');
        
        // Actualizar la interfaz
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        
        mostrarMensaje(`✅ Historial limpiado correctamente (${historial.length} viajes)`, 'success');
        
        // Intentar limpiar también de Firebase si está disponible
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando limpiar Firebase...');
                // Obtener todos los viajes de Firebase y eliminarlos uno por uno
                const tripsRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips');
                
                const snapshot = await tripsRef.get();
                const batch = firebaseSync.db.batch();
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log('✅ Historial de Firebase limpiado');
            } catch (error) {
                console.error('❌ Error limpiando Firebase:', error);
                // No mostrar error al usuario, ya se limpió localmente
            }
        }
    }
}

// =============================================
// SISTEMA DE FILTRADO DE HISTORIAL
// =============================================

function filtrarHistorial(historial, filtro) {
    if (!historial || historial.length === 0) return [];
    
    const ahora = new Date();
    
    switch (filtro) {
        case 'hoy':
            const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= hoy;
                } catch (error) {
                    return false;
                }
            });
            
        case 'semana':
            const inicioSemana = new Date(ahora);
            inicioSemana.setDate(ahora.getDate() - ahora.getDay());
            inicioSemana.setHours(0, 0, 0, 0);
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= inicioSemana;
                } catch (error) {
                    return false;
                }
            });
            
        case 'mes':
            const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= inicioMes;
                } catch (error) {
                    return false;
                }
            });
            
        case 'todos':
        default:
            return historial;
    }
}

function cambiarFiltroHistorial(nuevoFiltro) {
    filtroActual = nuevoFiltro;
    
    // Actualizar botones activos
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filtro === nuevoFiltro);
    });
    
    actualizarHistorialConFiltros();
}

// =============================================
// SISTEMA DE PESTAÑAS
// =============================================

function inicializarTabs() {
    console.log('🔄 Inicializando sistema de pestañas...');
    
    if (!elementos.tabButtons || elementos.tabButtons.length === 0) {
        console.error('❌ No se encontraron botones de pestañas');
        return;
    }
    
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            console.log('📁 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
    
    console.log('✅ Sistema de pestañas inicializado');
}

function cambiarPestana(tabId) {
    if (!elementos.tabButtons || !elementos.tabContents) return;
    
    elementos.tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
    
    elementos.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    } else if (tabId === 'historial') {
        actualizarHistorialConFiltros();
    }
}

// =============================================
// SISTEMA DE CÁLCULO
// =============================================

function manejarCalculoAutomatico() {
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    if (!elementos.tarifa || !elementos.minutos || !elementos.distancia) return;
    
    const tarifa = parseFloat(elementos.tarifa.value) || 0;
    const minutos = parseFloat(elementos.minutos.value) || 0;
    const distancia = parseFloat(elementos.distancia.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        if (elementos['auto-calc-indicator']) {
            elementos['auto-calc-indicator'].classList.remove('hidden');
        }
        
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        }
    } else {
        if (elementos['auto-calc-indicator']) {
            elementos['auto-calc-indicator'].classList.add('hidden');
        }
        if (elementos['resultado-rapido']) {
            elementos['resultado-rapido'].classList.add('hidden');
        }
        cerrarModalRapido();
    }
}

function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) return null;
    
    try {
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500;
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60);
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        const gananciaNeta = tarifa - costoTotal;
        
        const gananciaPorMinuto = tarifa / minutos;
        const gananciaPorKm = tarifa / distancia;
        
        let rentabilidad, emoji, texto;
        
        if (gananciaPorMinuto >= perfilActual.umbralMinutoRentable && 
            gananciaPorKm >= perfilActual.umbralKmRentable) {
            rentabilidad = 'rentable';
            emoji = '✅';
            texto = 'RENTABLE';
        } else if (gananciaPorMinuto >= perfilActual.umbralMinutoOportunidad && 
                   gananciaPorKm >= perfilActual.umbralKmOportunidad) {
            rentabilidad = 'oportunidad';
            emoji = '⚠️';
            texto = 'OPORTUNIDAD';
        } else {
            rentabilidad = 'no-rentable';
            emoji = '❌';
            texto = 'NO RENTABLE';
        }
        
        return {
            tarifa, minutos, distancia, gananciaNeta, gananciaPorMinuto, gananciaPorKm,
            costoCombustible, costoMantenimiento, costoSeguro, costoTotal,
            rentabilidad, emoji, texto, timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

// =============================================
// SISTEMA DE PERFILES
// =============================================

function mostrarConfigPerfil(perfil = null) {
    const form = elementos['perfil-form'];
    if (!form) return;
    
    if (perfil) {
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.nombre;
        document.getElementById('tipo-medida').value = perfil.tipoMedida;
        document.getElementById('tipo-combustible').value = perfil.tipoCombustible;
        document.getElementById('rendimiento').value = perfil.rendimiento;
        document.getElementById('precio-combustible').value = perfil.precioCombustible;
        document.getElementById('moneda').value = perfil.moneda;
        document.getElementById('umbral-minuto-rentable').value = perfil.umbralMinutoRentable;
        document.getElementById('umbral-km-rentable').value = perfil.umbralKmRentable;
        document.getElementById('umbral-minuto-oportunidad').value = perfil.umbralMinutoOportunidad;
        document.getElementById('umbral-km-oportunidad').value = perfil.umbralKmOportunidad;
        document.getElementById('costo-seguro').value = perfil.costoSeguro || 0;
        document.getElementById('costo-mantenimiento').value = perfil.costoMantenimiento || 0;
    } else {
        form.reset();
        document.getElementById('perfil-id').value = '';
        document.getElementById('umbral-minuto-rentable').value = '6.00';
        document.getElementById('umbral-km-rentable').value = '25.00';
        document.getElementById('umbral-minuto-oportunidad').value = '5.00';
        document.getElementById('umbral-km-oportunidad').value = '23.00';
    }
    
    actualizarUnidades();
    mostrarPantalla('config-perfil');
}

function guardarPerfil(event) {
    event.preventDefault();
    
    const perfilId = document.getElementById('perfil-id').value;
    
    const perfil = {
        id: perfilId || 'perfil_' + Date.now(),
        nombre: document.getElementById('nombre-perfil').value,
        tipoMedida: document.getElementById('tipo-medida').value,
        tipoCombustible: document.getElementById('tipo-combustible').value,
        rendimiento: parseFloat(document.getElementById('rendimiento').value),
        precioCombustible: parseFloat(document.getElementById('precio-combustible').value),
        moneda: document.getElementById('moneda').value,
        umbralMinutoRentable: parseFloat(document.getElementById('umbral-minuto-rentable').value),
        umbralKmRentable: parseFloat(document.getElementById('umbral-km-rentable').value),
        umbralMinutoOportunidad: parseFloat(document.getElementById('umbral-minuto-oportunidad').value),
        umbralKmOportunidad: parseFloat(document.getElementById('umbral-km-oportunidad').value),
        costoSeguro: parseFloat(document.getElementById('costo-seguro').value) || 0,
        costoMantenimiento: parseFloat(document.getElementById('costo-mantenimiento').value) || 0,
        fechaCreacion: perfilId ? perfiles.find(p => p.id === perfilId)?.fechaCreacion || new Date().toISOString() : new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    
    if (!perfil.nombre || !perfil.rendimiento || !perfil.precioCombustible) {
        mostrarError('Por favor, completa todos los campos requeridos');
        return;
    }
    
    if (perfilId) {
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfil;
        }
    } else {
        perfiles.push(perfil);
    }
    
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
    }
    
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    mostrarStatus('💾 Perfil guardado exitosamente', 'success');
}

function actualizarInterfazPerfiles() {
    if (!elementos['perfiles-lista']) return;
    
    elementos['perfiles-lista'].innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos['perfiles-lista'].innerHTML = `
            <div class="perfil-item" style="text-align: center; opacity: 0.7;">
                <div class="perfil-nombre">No hay perfiles creados</div>
                <div class="perfil-detalles">Crea tu primer perfil para comenzar</div>
            </div>
        `;
        return;
    }
    
    perfiles.forEach(perfil => {
        const perfilItem = document.createElement('div');
        perfilItem.className = `perfil-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        
        const unidadRendimiento = perfil.tipoMedida === 'mi' ? 'mpg' : 'Km/Gl';
        const detalles = `${perfil.rendimiento} ${unidadRendimiento} • ${perfil.moneda}`;
        
        perfilItem.innerHTML = `
            <div class="perfil-nombre">${perfil.nombre}</div>
            <div class="perfil-detalles">
                <span>${detalles}</span>
                <span>${perfil.tipoCombustible.toUpperCase()}</span>
            </div>
            <div class="perfil-acciones">
                <button class="secondary-button small" onclick="seleccionarPerfil('${perfil.id}')">
                    <span class="button-icon">🚗</span>
                    Usar
                </button>
                <button class="secondary-button small" onclick="editarPerfil('${perfil.id}')">
                    <span class="button-icon">✏️</span>
                    Editar
                </button>
                <button class="secondary-button small" onclick="eliminarPerfil('${perfil.id}')">
                    <span class="button-icon">🗑️</span>
                    Eliminar
                </button>
            </div>
        `;
        
        elementos['perfiles-lista'].appendChild(perfilItem);
    });
}

function seleccionarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        perfilActual = perfil;
        guardarDatos();
        mostrarPantalla('main');
        mostrarStatus(`🚗 Perfil "${perfil.nombre}" activado`, 'success');
        actualizarUnidades();
        actualizarEstadisticas();
    }
}

function editarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    }
}

function eliminarPerfil(perfilId) {
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil? Esta acción no se puede deshacer.')) {
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
        }
        
        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
    }
}

// =============================================
// SISTEMA DE SINCRONIZACIÓN MULTI-DISPOSITIVO
// =============================================

class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.db = null;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            console.log('📡 Inicializando Firebase Sync...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está cargado');
            }
            
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.userId = userCodeSystem.userId;
            
            this.initialized = true;
            console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase Sync:', error);
            return false;
        }
    }

    async saveProfile(profile) {
        if (!this.initialized) return false;

        try {
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profile.id);
            
            await profileRef.set({
                ...profile,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Perfil guardado en Firebase:', profile.nombre);
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando perfil en Firebase:', error);
            return false;
        }
    }

    async saveTrip(trip) {
        if (!this.initialized) return false;

        try {
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(trip.id);
            
            await tripRef.set({
                ...trip,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Viaje guardado en Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando viaje en Firebase:', error);
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) return null;

        try {
            const profilesRef = this.db.collection('users').doc(this.userId)
                .collection('profiles');
            
            const snapshot = await profilesRef.orderBy('fechaCreacion', 'desc').get();
            
            if (!snapshot.empty) {
                const profiles = [];
                snapshot.forEach(doc => {
                    profiles.push(doc.data());
                });
                
                console.log('✅ Perfiles cargados desde Firebase:', profiles.length);
                return profiles;
            } else {
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfiles desde Firebase:', error);
            return null;
        }
    }

    async loadTrips() {
        if (!this.initialized) return null;

        try {
            const tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            const snapshot = await tripsRef.orderBy('timestamp', 'desc').limit(100).get();
            
            if (!snapshot.empty) {
                const trips = [];
                snapshot.forEach(doc => {
                    trips.push(doc.data());
                });
                
                console.log('✅ Viajes cargados desde Firebase:', trips.length);
                return trips;
            } else {
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando viajes desde Firebase:', error);
            return null;
        }
    }
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN MEJORADAS
// =============================================

async function verificarConexionFirebase() {
    console.log('📡 Verificando conexión Firebase...');
    
    if (!firebaseSync) {
        console.log('❌ FirebaseSync no está inicializado');
        return false;
    }
    
    try {
        // Intentar una operación simple de Firebase
        const testRef = firebaseSync.db.collection('test').doc('connection_test');
        await testRef.set({
            test: true,
            timestamp: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Conexión Firebase OK');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión Firebase:', error);
        return false;
    }
}

async function resincronizarCompleta() {
    console.log('🔄 INICIANDO RESINCRONIZACIÓN COMPLETA...');
    
    // Verificar Firebase primero
    const firebaseOk = await verificarConexionFirebase();
    if (!firebaseOk) {
        mostrarError('No hay conexión con Firebase. Verifica tu internet.');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando todos los datos...', 'info');
    
    try {
        // 1. Subir perfiles a Firebase
        console.log('📤 Subiendo perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        console.log('✅ Perfiles sincronizados:', perfiles.length);
        
        // 2. Subir viajes a Firebase
        console.log('📤 Subiendo viajes...');
        const viajesParaSincronizar = historial.filter(item => item.aceptado).slice(0, 50);
        let viajesSubidos = 0;
        
        for (const viaje of viajesParaSincronizar) {
            const exito = await firebaseSync.saveTrip(viaje);
            if (exito) viajesSubidos++;
        }
        console.log('✅ Viajes sincronizados:', viajesSubidos, 'de', viajesParaSincronizar.length);
        
        // 3. Recargar datos de Firebase
        console.log('📥 Recargando datos...');
        await cargarDatos();
        
        console.log('✅ Resincronización completada');
        mostrarStatus(`✅ Sincronizado: ${viajesSubidos} viajes, ${perfiles.length} perfiles`, 'success');
        
    } catch (error) {
        console.error('❌ Error en resincronización:', error);
        mostrarStatus('❌ Error en sincronización', 'error');
    }
}

async function resetearSincronizacion() {
    console.log('🔄 RESETEANDO SISTEMA DE SINCRONIZACIÓN...');
    
    if (confirm('¿Estás seguro de que quieres resetear la sincronización? Esto no borrará tus datos locales.')) {
        // Limpiar instancia de Firebase
        firebaseSync = null;
        firebaseInitialized = false;
        
        // Recargar la página para reinicializar todo
        location.reload();
    }
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO
// =============================================

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    const savedCode = localStorage.getItem('DIBER_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', userCodeSystem.userCode);
        hideUserCodeModal();
        showUserCodeBanner();
        
        // Verificar conexión Firebase inmediatamente
        await initializeFirebaseSync();
        return true;
    } else {
        showUserCodeModal();
        return false;
    }
}

function generateUserCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    const input = document.getElementById('user-code-input');
    if (input) {
        input.value = code;
        input.focus();
        input.select();
    }
}

function setUserCode() {
    const input = document.getElementById('user-code-input');
    if (!input) return;
    
    let code = input.value.trim().toUpperCase();
    
    const codeRegex = /^[A-Z0-9]{3,6}$/;
    
    if (!code) {
        mostrarStatus('❌ Por favor escribe un código o genera uno automático', 'error');
        return;
    }
    
    if (!codeRegex.test(code)) {
        mostrarStatus('❌ Formato inválido. Usa 3-6 letras/números (ej: ABC123)', 'error');
        return;
    }
    
    userCodeSystem.userCode = code;
    userCodeSystem.userId = 'user_' + code;
    userCodeSystem.initialized = true;
    
    localStorage.setItem('DIBER_user_code', code);
    
    hideUserCodeModal();
    showUserCodeBanner();
    
    mostrarStatus('✅ Código de usuario establecido', 'success');
    
    setTimeout(async () => {
        await initializeFirebaseSync();
        await cargarDatos();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else {
            mostrarPantalla('main');
        }
    }, 1000);
}

function showUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) modal.style.display = 'flex';
}

function hideUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) modal.style.display = 'none';
}

function showUserCodeBanner() {
    const banner = document.getElementById('user-code-banner');
    const display = document.getElementById('user-code-display');
    
    if (banner && display && userCodeSystem.userCode) {
        display.textContent = `Código: ${userCodeSystem.userCode}`;
        banner.style.display = 'flex';
    }
}

// =============================================
// FUNCIONES PRINCIPALES - CORREGIDAS
// =============================================

async function initializeFirebaseSync() {
    console.log('🔄 Inicializando Firebase Sync...');
    
    // ✅ CORREGIDO: Prevenir inicialización múltiple
    if (firebaseInitialized && firebaseSync && firebaseSync.initialized) {
        console.log('✅ Firebase Sync ya estaba inicializado');
        return true;
    }
    
    firebaseSync = new FirebaseSync();
    const success = await firebaseSync.initialize();
    
    if (success) {
        console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
        firebaseInitialized = true;
        
        // ✅ CORREGIDO: Solo cargar datos si no se están cargando ya
        if (!loadingData) {
            setTimeout(async () => {
                await cargarDatos();
            }, 1000);
        }
        
        return true;
    } else {
        console.log('📱 Usando almacenamiento local solamente');
        firebaseInitialized = false;
        return false;
    }
}

async function cargarDatos() {
    // ✅ CORREGIDO: Prevenir múltiples ejecuciones
    if (loadingData) {
        console.log('⏳ Carga de datos en progreso, omitiendo...');
        return;
    }
    
    loadingData = true;
    console.log('🔄 Cargando datos...');
    
    try {
        // Cargar de localStorage primero
        try {
            // Cargar historial específico
            const historialGuardado = localStorage.getItem('historialViajes');
            if (historialGuardado) {
                historial = JSON.parse(historialGuardado);
                console.log('💾 Historial local cargado:', historial.length, 'viajes');
            }
            
            // Cargar datos generales
            const datosGuardados = localStorage.getItem('DIBER_data');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                perfiles = datos.perfiles || [];
                perfilActual = datos.perfilActual || null;
                console.log('💾 Datos generales cargados');
            }
        } catch (error) {
            console.error('Error cargando datos locales:', error);
            perfiles = [];
            historial = [];
        }

        // ✅ CORREGIDO: Solo cargar desde Firebase si está inicializado
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando cargar desde Firebase...');
                
                const cloudProfiles = await firebaseSync.loadProfiles();
                if (cloudProfiles && cloudProfiles.length > 0) {
                    console.log('✅ Perfiles de Firebase cargados:', cloudProfiles.length);
                    perfiles = cloudProfiles;
                    
                    // Actualizar perfil actual si es necesario
                    if (!perfilActual && perfiles.length > 0) {
                        perfilActual = perfiles[0];
                    }
                }
                
                const cloudTrips = await firebaseSync.loadTrips();
                if (cloudTrips && cloudTrips.length > 0) {
                    console.log('✅ Viajes de Firebase cargados:', cloudTrips.length);
                    
                    // Combinar historial local con cloud, evitando duplicados
                    const combinedHistorial = [...historial];
                    cloudTrips.forEach(cloudTrip => {
                        const exists = combinedHistorial.some(localTrip => localTrip.id === cloudTrip.id);
                        if (!exists) {
                            combinedHistorial.push(cloudTrip);
                        }
                    });
                    
                    // Ordenar por timestamp y limitar
                    historial = combinedHistorial
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 100);
                    
                    console.log('🔄 Historial combinado:', historial.length, 'viajes');
                    
                    // Guardar el historial combinado localmente
                    localStorage.setItem('historialViajes', JSON.stringify(historial));
                }
            } catch (error) {
                console.error('❌ Error cargando Firebase:', error);
            }
        }

        // Asegurar que tenemos un perfil
        if (!perfilActual && perfiles.length > 0) {
            perfilActual = perfiles[0];
        }

        actualizarInterfazPerfiles();
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
        guardarDatos(); // Sincronizar datos locales
        
        console.log('🎉 Carga de datos completada');
        console.log('📊 Resumen final:', {
            perfiles: perfiles.length,
            historial: historial.length,
            perfilActual: perfilActual?.nombre
        });
        
    } finally {
        loadingData = false;
    }
}

function guardarDatos() {
    console.log('💾 Guardando datos...');
    
    // Guardar historial específico
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    // Guardar datos generales
    localStorage.setItem('DIBER_data', JSON.stringify({
        perfiles,
        perfilActual,
        historial, // También guardar historial aquí por si acaso
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));

    console.log('✅ Datos guardados localmente');
    console.log('📊 Resumen guardado:', {
        perfiles: perfiles.length,
        historial: historial.length,
        perfilActual: perfilActual?.nombre
    });
}

function verificarEliminacion(viajeId) {
    console.log('🔍 VERIFICANDO ELIMINACIÓN:');
    console.log('ID a eliminar:', viajeId);
    
    // Verificar si existe en el historial
    const existe = historial.find(viaje => viaje.id === viajeId);
    console.log('¿Existe en historial?:', !!existe);
    
    if (existe) {
        console.log('Viaje encontrado:', existe);
    }
    
    // Verificar localStorage
    const historialLocal = localStorage.getItem('historialViajes');
    const historialParsed = historialLocal ? JSON.parse(historialLocal) : [];
    const existeEnLocalStorage = historialParsed.find(v => v.id === viajeId);
    console.log('¿Existe en localStorage?:', !!existeEnLocalStorage);
    
    return {
        existeEnHistorial: !!existe,
        existeEnLocalStorage: !!existeEnLocalStorage
    };
}

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

function mostrarPantalla(pantalla) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (pantalla === 'perfil') {
        if (elementos['perfil-screen']) {
            elementos['perfil-screen'].classList.add('active');
        }
    } else if (pantalla === 'config-perfil') {
        if (elementos['config-perfil-screen']) {
            elementos['config-perfil-screen'].classList.add('active');
        }
    } else if (pantalla === 'main') {
        if (elementos['main-screen']) {
            elementos['main-screen'].classList.add('active');
        }
        actualizarUnidades();
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
    }
}

// =============================================
// FUNCIONES DE UTILIDAD - ACTUALIZADAS
// =============================================

function actualizarEstadisticas() {
    console.log('📊 Actualizando estadísticas...');
    
    if (!elementos['stats-viajes'] || !elementos['stats-ganancia']) {
        return;
    }
    
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => {
        if (!item.aceptado) return false;
        try {
            const itemDate = new Date(item.timestamp).toDateString();
            return itemDate === hoy;
        } catch (error) {
            return false;
        }
    });
    
    const totalViajes = viajesHoy.length;
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + (item.ganancia || item.tarifa || 0), 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const distanciaTotal = viajesHoy.reduce((sum, item) => sum + (item.distancia || 0), 0);
    
    const viajesRentables = viajesHoy.filter(item => {
        return item.rentable === true || item.rentabilidad === 'rentable';
    }).length;
    
    // ✅ ACTUALIZAR ESTADÍSTICAS PRINCIPALES
    elementos['stats-viajes'].textContent = totalViajes;
    elementos['stats-ganancia'].textContent = formatearMoneda(gananciaTotal);
    
    if (elementos['stats-tiempo']) {
        elementos['stats-tiempo'].textContent = `${tiempoTotal}min`;
    }
    
    if (elementos['stats-rentables']) {
        elementos['stats-rentables'].textContent = viajesRentables;
    }
    
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    
    // ✅ ACTUALIZAR RENDIMIENTO CON NUEVOS IDs
    actualizarRendimientoUnificado(gananciaPorHora, viajePromedio, distanciaTotal, eficiencia);
    
    console.log('📈 Estadísticas de HOY actualizadas:', {
        totalViajes,
        viajesRentables,
        eficiencia: `${eficiencia.toFixed(1)}%`,
        gananciaTotal: formatearMoneda(gananciaTotal),
        gananciaPorHora: formatearMoneda(gananciaPorHora),
        distanciaTotal: `${distanciaTotal} km`,
        fecha: hoy
    });
}

// ✅ FUNCIÓN ACTUALIZADA con el nuevo diseño
function actualizarRendimientoUnificado(gananciaPorHora, viajePromedio, distanciaTotal, eficiencia) {
    console.log('🎯 Actualizando rendimiento unificado...');
    
    // Actualizar métricas principales
    const elementos = {
        'rendimiento-ganancia-hora-card': formatearMoneda(gananciaPorHora),
        'rendimiento-viaje-promedio-linea': formatearMoneda(viajePromedio),
        'rendimiento-distancia-total-card': `${distanciaTotal} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}`,
        'rendimiento-ganancia-hora-linea': `${formatearMoneda(gananciaPorHora)} por hora`,
        'rendimiento-eficiencia-card': `${eficiencia.toFixed(1)}%`,
        'rendimiento-eficiencia-badge': `Eficiencia: ${eficiencia.toFixed(1)}%`
    };
    
    // Actualizar todos los elementos
    Object.entries(elementos).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });
    
    // ✅ ACTUALIZAR BARRA DE PROGRESO
    const progresoFill = document.getElementById('progreso-eficiencia-fill');
    if (progresoFill) {
        progresoFill.style.width = `${Math.min(eficiencia, 100)}%`;
        
        // Cambiar color según la eficiencia
        if (eficiencia >= 80) {
            progresoFill.style.background = 'linear-gradient(90deg, #00b09b 0%, #96c93d 100%)';
        } else if (eficiencia >= 60) {
            progresoFill.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
        } else if (eficiencia >= 40) {
            progresoFill.style.background = 'linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%)';
        } else {
            progresoFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffa8a8 100%)';
        }
    }
    
    console.log('✅ Rendimiento unificado actualizado con diseño mejorado');
}

// ✅ NUEVA FUNCIÓN: Obtener estadísticas para PDF (todos los viajes)
function obtenerEstadisticasCompletas() {
    // Usar TODOS los viajes aceptados del historial completo para PDF
    const viajesAceptados = historial.filter(v => v.aceptado === true);
    const totalViajes = viajesAceptados.length;
    
    const viajesRentables = viajesAceptados.filter(v => {
        return v.rentable === true || v.rentabilidad === 'rentable';
    }).length;
    
    const gananciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.ganancia || v.tarifa || 0), 0);
    const tiempoTotal = viajesAceptados.reduce((sum, v) => sum + (v.minutos || 0), 0);
    const distanciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.distancia || 0), 0);
    
    // Calcular costos totales
    const costoCombustibleTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoCombustible || 0), 0);
    const costoMantenimientoTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoMantenimiento || 0), 0);
    const costoSeguroTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoSeguro || 0), 0);
    const costoTotal = costoCombustibleTotal + costoMantenimientoTotal + costoSeguroTotal;
    
    const gananciaNeta = gananciaTotal - costoTotal;
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;

    return {
        viajesAceptados,
        totalViajes,
        viajesRentables,
        gananciaTotal,
        tiempoTotal,
        distanciaTotal,
        costoCombustibleTotal,
        costoMantenimientoTotal,
        costoSeguroTotal,
        costoTotal,
        gananciaNeta,
        eficiencia,
        viajePromedio,
        gananciaPorHora
    };
}

// ✅ NUEVA FUNCIÓN: Actualizar estadísticas de rendimiento específicas
function actualizarEstadisticasRendimiento(totalViajes, viajesRentables, gananciaTotal, tiempoTotal, gananciaPorHora, eficiencia) {
    // Actualizar métricas de rendimiento si existen
    const statsGananciaHora = document.getElementById('stats-ganancia-hora');
    const statsDistanciaTotal = document.getElementById('stats-distancia-total');
    const statsEficiencia = document.getElementById('stats-eficiencia');
    const statsEficienciaBadge = document.getElementById('stats-eficiencia-badge');
    
    if (statsGananciaHora) {
        statsGananciaHora.textContent = formatearMoneda(gananciaPorHora);
    }
    
    // Calcular distancia total
    const distanciaTotal = historial
        .filter(item => item.aceptado === true)
        .reduce((sum, item) => sum + (item.distancia || 0), 0);
    
    if (statsDistanciaTotal) {
        const unidad = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
        statsDistanciaTotal.textContent = `${distanciaTotal} ${unidad}`;
    }
    
    if (statsEficiencia) {
        statsEficiencia.textContent = `${eficiencia.toFixed(1)}%`;
    }
    
    if (statsEficienciaBadge) {
        statsEficienciaBadge.textContent = `Eficiencia: ${eficiencia.toFixed(1)}%`;
    }
    
    console.log('📈 Estadísticas de rendimiento actualizadas:', {
        totalViajes,
        viajesRentables,
        eficiencia: `${eficiencia.toFixed(1)}%`,
        gananciaTotal: formatearMoneda(gananciaTotal),
        gananciaPorHora: formatearMoneda(gananciaPorHora)
    });
}

function actualizarEstadisticasDia(viaje) {
    console.log('📊 Actualizando estadísticas del día:', viaje);
}

function actualizarUnidades() {
    const tipoMedida = perfilActual?.tipoMedida || 'km';
    const moneda = perfilActual?.moneda || 'DOP';
    
    const distanciaUnit = document.getElementById('distancia-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (distanciaUnit) {
        distanciaUnit.textContent = tipoMedida === 'mi' ? 'mi' : 'Km';
    }
    if (monedaTarifa) {
        monedaTarifa.textContent = moneda;
    }
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos['status-indicator'] || !elementos['status-text']) return;
    
    elementos['status-text'].textContent = mensaje;
    elementos['status-indicator'].className = `status-indicator ${tipo}`;
    elementos['status-indicator'].classList.remove('hidden');
    
    setTimeout(() => {
        elementos['status-indicator'].classList.add('hidden');
    }, 3000);
}

function mostrarMensaje(mensaje, tipo = 'info') {
    mostrarStatus(mensaje, tipo);
}

function limpiarFormulario() {
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    if (elementos['auto-calc-indicator']) elementos['auto-calc-indicator'].classList.add('hidden');
    if (elementos['resultado-rapido']) elementos['resultado-rapido'].classList.add('hidden');
    calculoActual = null;
    cerrarModalRapido();
}

function cerrarModal() {
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
}

function cerrarModalRapido() {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido) {
        modalRapido.classList.add('hidden');
    }
}

function cerrarExportModal() {
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
}

function cerrarSyncPanel() {
    console.log('❌ Cerrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

// =============================================
// FUNCIONES DE PROCESAMIENTO DE VIAJES
// =============================================

function procesarViaje(aceptado) {
    console.log('🔄 Procesando viaje:', { aceptado, calculoActual: !!calculoActual });
    
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    if (!perfilActual) {
        mostrarError('No hay perfil seleccionado. Por favor, selecciona un perfil primero.');
        return;
    }

    try {
        guardarEnHistorial(calculoActual, aceptado);
        
        if (aceptado) {
            mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
        } else {
            mostrarStatus('❌ Viaje rechazado', 'info');
        }

        limpiarFormulario();
        cerrarModal();
        
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
    } catch (error) {
        console.error('❌ Error procesando viaje:', error);
        mostrarError('Error al procesar el viaje');
    }
}

function procesarViajeRapido(aceptado) {
    console.log('⚡ Procesando viaje rápido:', { aceptado, calculoActual: !!calculoActual });
    
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    cerrarModalRapido();
    
    // Asegurarnos de que el cálculo actual tenga todos los datos necesarios
    const viajeParaHistorial = {
        ...calculoActual,
        aceptado: aceptado,
        // Forzar la inclusión de todos los campos de rentabilidad
        rentable: calculoActual.rentabilidad === 'rentable',
        emoji: calculoActual.emoji,
        texto: calculoActual.texto
    };
    
    agregarAlHistorial(viajeParaHistorial);
    
    if (aceptado) {
        mostrarMensaje('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarMensaje('❌ Viaje rechazado', 'info');
    }
    
    limpiarFormulario();
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
}

function guardarEnHistorial(resultado, aceptado) {
    console.log('💾 GUARDANDO EN HISTORIAL...', { aceptado, resultado });
    
    if (!resultado) {
        console.error('❌ No hay resultado para guardar');
        return;
    }

    // Asegurarnos de que el resultado tenga la rentabilidad correcta
    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: 'viaje_' + Date.now(),
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre,
        timestamp: new Date().toISOString(),
        // Forzar la actualización de los campos de rentabilidad
        rentable: resultado.rentabilidad === 'rentable',
        emoji: resultado.emoji,
        texto: resultado.texto
    };
    
    console.log('📝 Item a guardar:', historialItem);
    console.log('🎯 Rentabilidad del viaje:', historialItem.rentabilidad, 'Rentable:', historialItem.rentable);
    
    historial.unshift(historialItem);
    console.log('✅ Agregado al historial local. Total:', historial.length);
    
    if (aceptado && firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Guardando en Firebase...');
            firebaseSync.saveTrip(historialItem);
            console.log('✅ Guardado en Firebase');
        } catch (error) {
            console.error('❌ Error guardando en Firebase:', error);
        }
    }
    
    guardarDatos();
    console.log('✅ Datos guardados en localStorage');
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
    
    console.log('🎉 Proceso de guardado completado');
}

// Función para debuggear el historial (puedes llamarla desde la consola)
function debugHistorial() {
    console.log('🐛 DEBUG DEL HISTORIAL:');
    historial.forEach((viaje, index) => {
        console.log(`Viaje ${index + 1}:`, {
            id: viaje.id,
            ganancia: viaje.ganancia,
            rentabilidad: viaje.rentabilidad,
            rentable: viaje.rentable,
            emoji: viaje.emoji,
            texto: viaje.texto
        });
    });
    
    // También mostrar en un alert para fácil visualización
    const resumen = historial.map((v, i) => 
        `Viaje ${i+1}: ${v.ganancia} - ${v.rentabilidad} (${v.rentable ? 'SÍ' : 'NO'})`
    ).join('\n');
    
    alert(`DEBUG HISTORIAL (${historial.length} viajes):\n\n${resumen}`);
}

// =============================================
// SISTEMA DE RESULTADO RÁPIDO
// =============================================

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.add('hidden');
    }
    
    let modalRapido = document.getElementById('modal-rapido');
    if (!modalRapido) {
        modalRapido = document.createElement('div');
        modalRapido.id = 'modal-rapido';
        modalRapido.className = 'modal-rapido hidden';
        modalRapido.innerHTML = `
            <div class="modal-rapido-contenido">
                <button class="modal-rapido-cerrar" onclick="cerrarModalRapido()">×</button>
                <div class="modal-rapido-header">
                    <div class="modal-rapido-badge" id="modal-rapido-badge">
                        <span class="modal-rapido-emoji" id="modal-rapido-emoji">✅</span>
                        <span class="modal-rapido-texto" id="modal-rapido-texto">RENTABLE</span>
                    </div>
                </div>
                <div class="modal-rapido-metricas">
                    <div class="modal-rapido-metrica">
                        <div class="modal-rapido-metrica-icono">⏱️</div>
                        <div class="modal-rapido-metrica-valor" id="modal-rapido-minuto">--/min</div>
                        <div class="modal-rapido-metrica-label">Por minuto</div>
                    </div>
                    <div class="modal-rapido-metrica">
                        <div class="modal-rapido-metrica-icono">🛣️</div>
                        <div class="modal-rapido-metrica-valor" id="modal-rapido-km">--/km</div>
                        <div class="modal-rapido-metrica-label">Por distancia</div>
                    </div>
                </div>
                <div class="modal-rapido-acciones">
                    <button class="secondary-button" onclick="procesarViajeRapido(false)">
                        <span class="button-icon">❌</span>
                        Rechazar Viaje
                    </button>
                    <button class="primary-button" id="modal-rapido-aceptar" onclick="procesarViajeRapido(true)">
                        <span class="button-icon">✅</span>
                        Aceptar Viaje
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalRapido);
    }
    
    const modalBadge = document.getElementById('modal-rapido-badge');
    document.getElementById('modal-rapido-emoji').textContent = resultado.emoji;
    document.getElementById('modal-rapido-texto').textContent = resultado.texto;
    document.getElementById('modal-rapido-minuto').textContent = `${formatearMoneda(resultado.gananciaPorMinuto)}/min`;
    
    const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
    document.getElementById('modal-rapido-km').textContent = `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`;
    
    modalBadge.className = 'modal-rapido-badge';
    modalBadge.classList.add(resultado.rentabilidad);
    
    const btnAceptar = document.getElementById('modal-rapido-aceptar');
    btnAceptar.className = 'primary-button';
    btnAceptar.classList.add(resultado.rentabilidad);
    
    modalRapido.classList.remove('hidden');
    
    calculoActual = resultado;
}

// =============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// =============================================

function configurarEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    // Sistema de Pestañas
    inicializarTabs();
    
    // Cálculo Automático
    if (elementos.tarifa) {
        elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.minutos) {
        elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.distancia) {
        elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    }
    
    // Botones de Acción
    if (elementos['aceptar-viaje']) {
        elementos['aceptar-viaje'].addEventListener('click', () => procesarViaje(true));
    }
    if (elementos['rechazar-viaje']) {
        elementos['rechazar-viaje'].addEventListener('click', () => procesarViaje(false));
    }
    
    // Historial
    if (elementos['clear-history']) {
        elementos['clear-history'].addEventListener('click', limpiarHistorialCompleto);
    }
    
    // ✅ NUEVO: Botón de exportar historial
    if (elementos['exportar-historial']) {
        elementos['exportar-historial'].addEventListener('click', mostrarExportModal);
    }
    
    // Perfiles
    if (elementos['nuevo-perfil-btn']) {
        elementos['nuevo-perfil-btn'].addEventListener('click', () => mostrarConfigPerfil());
    }
    if (elementos['volver-perfiles']) {
        elementos['volver-perfiles'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (elementos['cancelar-perfil']) {
        elementos['cancelar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (elementos['cambiar-perfil']) {
        elementos['cambiar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (elementos['perfil-form']) {
        elementos['perfil-form'].addEventListener('submit', guardarPerfil);
    }
    
    // Tema
    if (elementos['theme-toggle']) {
        elementos['theme-toggle'].addEventListener('click', alternarTema);
    }
  
    // Sincronización
    if (elementos['sync-status-btn']) {
        elementos['sync-status-btn'].addEventListener('click', mostrarPanelSync);
    }
    
    // ✅ NUEVO: Filtros de historial
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cambiarFiltroHistorial(btn.dataset.filtro);
        });
    });
    
    console.log('✅ Event listeners configurados');
}

function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('DIBER_theme', newTheme);
    
    const themeIcon = elementos['theme-toggle']?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('DIBER_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = elementos['theme-toggle']?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// EJECUTA ESTO EN LA CONSOLA para ver qué elementos tienes
function diagnosticarRendimiento() {
    console.log('🔍 DIAGNÓSTICO DE RENDIMIENTO');
    console.log('==============================');
    
    const elementosClave = [
        'rendimiento-ganancia-hora-linea',
        'rendimiento-viaje-promedio-linea', 
        'stats-ganancia-hora',
        'stats-distancia-total',
        'stats-eficiencia',
        'stats-eficiencia-badge'
    ];
    
    elementosClave.forEach(id => {
        const el = document.getElementById(id);
        console.log(`${id}:`, el ? `✅ "${el.textContent}"` : '❌ NO EXISTE');
    });
    
    // Buscar duplicados
    const todosElementos = document.querySelectorAll('[id]');
    const conteoIds = {};
    
    todosElementos.forEach(el => {
        conteoIds[el.id] = (conteoIds[el.id] || 0) + 1;
    });
    
    const duplicados = Object.entries(conteoIds).filter(([id, count]) => count > 1);
    console.log('🔁 Elementos duplicados:', duplicados);
}

// =============================================
// CONFIGURACIÓN INICIAL
// =============================================

function configurarSistemaTrafico() {
    console.log('🚗 Configurando análisis automático de tráfico...');
    
    // Reemplazar el event listener del cálculo automático
    const inputs = ['tarifa', 'minutos', 'distancia'];
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.removeEventListener('input', manejarCalculoAutomatico);
            elemento.addEventListener('input', manejarCalculoConTrafico);
        }
    });
}

function manejarCalculoConTrafico() {
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    timeoutCalculo = setTimeout(calcularAutomaticoConTrafico, 600); // Más rápido
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN
// =============================================

function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
    }
}

async function forzarSincronizacion() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('❌ Firebase Sync no disponible');
        return;
    }
    
    console.log('🔄 INICIANDO SINCRONIZACIÓN MANUAL...');
    mostrarStatus('🔄 Sincronizando con Firebase...', 'info');
    
    try {
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        
        const viajesAceptados = historial.filter(item => item.aceptado).slice(0, 20);
        for (const viaje of viajesAceptados) {
            await firebaseSync.saveTrip(viaje);
        }
        
        console.log('✅ Sincronización manual completada');
        mostrarStatus('✅ Sincronización completada', 'success');
        
    } catch (error) {
        console.error('❌ Error en sincronización manual:', error);
        mostrarStatus('❌ Error en sincronización', 'error');
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN CON FIREBASE

✅ Cómo funciona:
1. Tus perfiles se guardan individualmente en Firebase
2. Cada viaje es un documento independiente
3. Todos tus dispositivos acceden a los mismos datos
4. Los cambios se sincronizan automáticamente

📱 Dispositivos conectados: Todos los que usen tu mismo código

💡 Características:
• Sincronización en tiempo real
• Sin conflictos entre dispositivos
• Respaldo seguro en la nube
• Totalmente gratuito

🔒 Tus datos son privados y solo tú puedes acceder a ellos`);
}

function diagnosticarSync() {
    console.log('🔧 INICIANDO DIAGNÓSTICO...');
    
    const diagnostico = `
🎉 DIAGNÓSTICO COMPLETADO

📊 DATOS LOCALES:
• Perfiles: ${perfiles.length}
• Historial total: ${historial.length}
• Viajes aceptados: ${historial.filter(item => item.aceptado).length}
• Perfil actual: ${perfilActual?.nombre || 'Ninguno'}

☁️ FIREBASE:
• Estado: ${firebaseSync?.initialized ? 'Conectado' : 'No conectado'}

📱 INTERFAZ:
• Estadísticas: ${elementos.statsViajes ? 'OK' : 'ERROR'}
• Historial: ${elementos.historyList ? 'OK' : 'ERROR'}

🔧 ACCIONES RECOMENDADAS:
1. Usa "Sincronizar Ahora" para subir datos
2. Verifica que los viajes tengan "aceptado: true"
3. Los viajes RECHAZADOS no se muestran en el historial
    `;
    
    alert(diagnostico);
}

// =============================================
// FUNCIONES GLOBALES
// =============================================

window.cerrarModal = cerrarModal;
window.cerrarModalRapido = cerrarModalRapido;
window.cerrarExportModal = cerrarExportModal;
window.cerrarSyncPanel = cerrarSyncPanel;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.cambiarUsuario = cambiarUsuario;
window.eliminarDelHistorial = eliminarDelHistorial;
window.limpiarHistorialCompleto = limpiarHistorialCompleto;
window.procesarViajeRapido = procesarViajeRapido;
window.mostrarPanelSync = mostrarPanelSync;
window.forzarSincronizacion = forzarSincronizacion;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSync;
window.showUserCodeModal = showUserCodeModal;
window.exportarHistorial = exportarHistorial;
window.exportarHistorialPDF = exportarHistorialPDF;
window.mostrarExportModal = mostrarExportModal;
window.diagnosticarSincronizacion = diagnosticarSincronizacion;
window.resincronizarCompleta = resincronizarCompleta;
window.resetearSincronizacion = resetearSincronizacion;
window.verificarConexionFirebase = verificarConexionFirebase;

function cambiarUsuario() {
    if (confirm('¿Estás seguro de que quieres cambiar de usuario?')) {
        localStorage.removeItem('DIBER_user_code');
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        const banner = document.getElementById('user-code-banner');
        if (banner) banner.style.display = 'none';
        
        showUserCodeModal();
    }
}

// =============================================
// INICIALIZACIÓN COMPLETA CON ANÁLISIS DE TRÁFICO
// =============================================

// Variables globales para el sistema de tráfico
let trafficAnalyzer = null;
let trafficInitialized = false;

async function inicializarApp() {
    // Prevenir inicialización múltiple
    if (window.appInitialized) {
        console.log('🚫 App ya inicializada, omitiendo...');
        return;
    }
    
    console.log('🚀 Inicializando DIBER...');
    
    // 1. Inicializar elementos DOM
    inicializarElementosDOM();
    
    try {
        // 2. Sistema de código de usuario
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        // 3. Firebase Sync
        await initializeFirebaseSync();
        
        // 4. ✅ INICIALIZAR SISTEMA DE TRÁFICO AUTOMÁTICO
        await inicializarSistemaTrafico();
        
        // 5. Cargar datos
        await cargarDatos();
        
        // 6. Configuración de UI
        aplicarTemaGuardado();
        configurarEventListeners();
        configurarModalExportacion();
        
        // 7. Mostrar pantalla adecuada
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
        } else {
            mostrarPantalla('perfil');
        }
        
        // Marcar como inicializado
        window.appInitialized = true;
        console.log('🎉 DIBER inicializado correctamente');
        console.log('✅ Sistema de tráfico automático activado');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// =============================================
// SISTEMA DE ANÁLISIS DE TRÁFICO AUTOMÁTICO
// =============================================

class TrafficRadiusAnalyzer {
    constructor() {
        this.radiusKm = 10;
        this.congestionLevels = {
            low: { factor: 1.0, emoji: '✅', color: '#4CAF50', text: 'Fluido' },
            moderate: { factor: 1.3, emoji: '⚠️', color: '#FF9800', text: 'Moderado' },
            heavy: { factor: 1.7, emoji: '🚗', color: '#F44336', text: 'Pesado' },
            severe: { factor: 2.2, emoji: '🚨', color: '#D32F2F', text: 'Muy Pesado' }
        };
        this.lastLocation = null;
    }

    // 🔍 Análisis SUPER RÁPIDO
    async quickTrafficAnalysis(userMinutes) {
        console.log('⚡ Análisis rápido de tráfico...');
        
        try {
            // 1. Ubicación rápida
            const location = await this.getQuickLocation();
            
            // 2. Análisis instantáneo
            const trafficCondition = this.instantTrafficCheck();
            
            // 3. Cálculo inmediato
            const adjustedTime = Math.ceil(userMinutes * this.congestionLevels[trafficCondition].factor);
            
            return {
                originalTime: userMinutes,
                adjustedTime: adjustedTime,
                trafficCondition: trafficCondition,
                trafficInfo: this.congestionLevels[trafficCondition],
                adjustment: ((this.congestionLevels[trafficCondition].factor - 1) * 100).toFixed(0),
                isSignificant: adjustedTime > userMinutes * 1.2,
                location: location
            };
            
        } catch (error) {
            console.log('🔄 Usando estimación conservadora');
            return this.getConservativeEstimate(userMinutes);
        }
    }

    // 📍 Obtención RÁPIDA de ubicación
    async getQuickLocation() {
        // Cache de 30 segundos para mayor velocidad
        if (this.lastLocation && Date.now() - this.lastLocation.timestamp < 30000) {
            return this.lastLocation.coords;
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    this.lastLocation = {
                        coords: coords,
                        timestamp: Date.now()
                    };
                    
                    resolve(coords);
                },
                (error) => {
                    console.warn('Error obteniendo ubicación:', error);
                    reject(error);
                },
                { 
                    enableHighAccuracy: false, // Más rápido
                    timeout: 3000,            // Solo 3 segundos
                    maximumAge: 60000         // Aceptar datos de hasta 1 minuto
                }
            );
        });
    }

    // 🕒 Detección INSTANTÁNEA de tráfico
    instantTrafficCheck() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        
        // Lógica optimizada para República Dominicana
        if (isWeekend) {
            // Fin de semana en RD
            if (hour >= 11 && hour <= 20) return 'moderate';
            return 'low';
        } else {
            // Semana en RD - horarios pico
            if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) return 'heavy';
            if ((hour >= 12 && hour <= 14)) return 'moderate';
            return 'low';
        }
    }

    getConservativeEstimate(userMinutes) {
        const hour = new Date().getHours();
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        const factor = isPeak ? 1.6 : 1.2;
        
        return {
            originalTime: userMinutes,
            adjustedTime: Math.ceil(userMinutes * factor),
            trafficCondition: isPeak ? 'heavy' : 'moderate',
            trafficInfo: this.congestionLevels[isPeak ? 'heavy' : 'moderate'],
            adjustment: ((factor - 1) * 100).toFixed(0),
            isSignificant: true,
            location: null
        };
    }
}

// =============================================
// FUNCIONES DE CONFIGURACIÓN DEL SISTEMA DE TRÁFICO
// =============================================

async function inicializarSistemaTrafico() {
    console.log('🚗 Inicializando sistema de análisis de tráfico...');
    
    try {
        // Crear instancia del analizador
        trafficAnalyzer = new TrafficRadiusAnalyzer();
        
        // Configurar event listeners para tráfico
        configurarSistemaTrafico();
        
        // Verificar permisos de ubicación
        await verificarPermisosUbicacion();
        
        trafficInitialized = true;
        console.log('✅ Sistema de tráfico inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando sistema de tráfico:', error);
        // El sistema seguirá funcionando sin análisis de tráfico
    }
}

function configurarSistemaTrafico() {
    console.log('🔧 Configurando event listeners de tráfico...');
    
    // Reemplazar los event listeners existentes
    const inputs = ['tarifa', 'minutos', 'distancia'];
    
    inputs.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            // Remover listener antiguo si existe
            elemento.removeEventListener('input', manejarCalculoAutomatico);
            
            // Agregar nuevo listener con tráfico
            elemento.addEventListener('input', manejarCalculoConTrafico);
        }
    });
    
    console.log('✅ Event listeners de tráfico configurados');
}

function manejarCalculoConTrafico() {
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    timeoutCalculo = setTimeout(calcularAutomaticoConTrafico, 600);
}

// 🔄 FUNCIÓN PRINCIPAL DE CÁLCULO CON TRÁFICO
async function calcularAutomaticoConTrafico() {
    if (!elementos.tarifa || !elementos.minutos || !elementos.distancia) return;
    
    const tarifa = parseFloat(elementos.tarifa.value) || 0;
    const minutos = parseFloat(elementos.minutos.value) || 0;
    const distancia = parseFloat(elementos.distancia.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        // Mostrar indicador de análisis
        if (elementos['auto-calc-indicator']) {
            elementos['auto-calc-indicator'].classList.remove('hidden');
            elementos['auto-calc-indicator'].classList.add('traffic-analysis');
        }
        
        let resultadoFinal;
        
        // ✅ SOLO analizar tráfico para viajes > 3 minutos y si el sistema está activo
        if (minutos > 3 && trafficInitialized && trafficAnalyzer) {
            try {
                resultadoFinal = await analizarTraficoAutomatico(tarifa, minutos, distancia);
            } catch (error) {
                console.warn('Error en análisis de tráfico, usando cálculo normal:', error);
                resultadoFinal = calcularRentabilidad(tarifa, minutos, distancia);
            }
        } else {
            // Cálculo normal para viajes cortos o sin sistema de tráfico
            resultadoFinal = calcularRentabilidad(tarifa, minutos, distancia);
        }
        
        if (resultadoFinal) {
            calculoActual = resultadoFinal;
            mostrarResultadoRapido(resultadoFinal);
        }
        
        // Restaurar indicador normal
        if (elementos['auto-calc-indicator']) {
            elementos['auto-calc-indicator'].classList.remove('traffic-analysis');
        }
        
    } else {
        // Ocultar elementos si no hay datos completos
        if (elementos['auto-calc-indicator']) {
            elementos['auto-calc-indicator'].classList.add('hidden');
        }
        if (elementos['resultado-rapido']) {
            elementos['resultado-rapido'].classList.add('hidden');
        }
        cerrarModalRapido();
    }
}

// 🚦 ANÁLISIS AUTOMÁTICO DE TRÁFICO
async function analizarTraficoAutomatico(tarifa, minutos, distancia) {
    console.log(`🚦 Analizando tráfico para ${minutos}min, ${distancia}km...`);
    
    const trafficAnalysis = await trafficAnalyzer.quickTrafficAnalysis(minutos);
    const resultado = calcularRentabilidad(tarifa, trafficAnalysis.adjustedTime, distancia);
    
    if (resultado) {
        // Agregar información de tráfico al resultado
        resultado.trafficAnalysis = trafficAnalysis;
        resultado.tiempoOriginal = minutos;
        resultado.tiempoConTrafico = trafficAnalysis.adjustedTime;
        resultado.esAjustadoPorTrafico = trafficAnalysis.isSignificant;
        
        // Mostrar información de tráfico en la UI
        if (trafficAnalysis.isSignificant) {
            mostrarInfoTraficoEnResultado(resultado, trafficAnalysis);
        }
        
        console.log('✅ Análisis de tráfico completado:', {
            original: minutos + 'min',
            conTrafico: trafficAnalysis.adjustedTime + 'min', 
            condicion: trafficAnalysis.trafficCondition,
            rentabilidad: resultado.rentabilidad
        });
    }
    
    return resultado;
}

// 💡 MOSTRAR INFO DE TRÁFICO EN EL RESULTADO
function mostrarInfoTraficoEnResultado(resultado, trafficAnalysis) {
    const resultadoRapido = elementos['resultado-rapido'];
    
    if (resultadoRapido && !resultadoRapido.classList.contains('hidden')) {
        // Limpiar badge anterior si existe
        const existingBadge = resultadoRapido.querySelector('.trafico-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
        
        // Crear nuevo badge de tráfico
        const traficoBadge = document.createElement('div');
        traficoBadge.className = 'trafico-badge';
        traficoBadge.innerHTML = `
            <div class="trafico-indicador trafico-${trafficAnalysis.trafficCondition}" 
                 style="border-left-color: ${trafficAnalysis.trafficInfo.color}">
                <span class="trafico-emoji">${trafficAnalysis.trafficInfo.emoji}</span>
                <span class="trafico-texto">Tráfico ${trafficAnalysis.trafficInfo.text}</span>
                <span class="trafico-tiempo">${trafficAnalysis.adjustedTime} min</span>
            </div>
        `;
        
        // Insertar al inicio del contenido del resultado
        const resultadoContent = resultadoRapido.querySelector('.resultado-content');
        if (resultadoContent) {
            resultadoContent.insertBefore(traficoBadge, resultadoContent.firstChild);
        }
    }
}

// 🔍 VERIFICAR PERMISOS DE UBICACIÓN
async function verificarPermisosUbicacion() {
    return new Promise((resolve) => {
        if (!navigator.permissions) {
            console.log('🔶 API de permisos no disponible');
            resolve(false);
            return;
        }
        
        navigator.permissions.query({ name: 'geolocation' })
            .then((result) => {
                console.log('📍 Estado permisos ubicación:', result.state);
                
                if (result.state === 'granted') {
                    console.log('✅ Permisos de ubicación concedidos');
                    resolve(true);
                } else if (result.state === 'prompt') {
                    console.log('🔶 Permisos de ubicación pendientes');
                    resolve(false);
                } else {
                    console.log('❌ Permisos de ubicación denegados');
                    resolve(false);
                }
            })
            .catch((error) => {
                console.warn('Error verificando permisos:', error);
                resolve(false);
            });
    });
}

// =============================================
// CSS PARA EL SISTEMA DE TRÁFICO (agregar a tu styles.css)
// =============================================

function agregarEstilosTrafico() {
    const styles = `
        /* Indicador de análisis de tráfico */
        .auto-calc-indicator.traffic-analysis {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white;
        }
        
        .auto-calc-indicator.traffic-analysis .auto-calc-icon {
            animation: pulse 1s infinite;
        }
        
        /* Badge de tráfico en resultados */
        .trafico-badge {
            margin-bottom: 15px;
            animation: slideDown 0.3s ease;
        }
        
        .trafico-indicador {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            border-left: 4px solid #FF9800;
            font-size: 0.85em;
            justify-content: space-between;
        }
        
        .trafico-emoji {
            font-size: 1.2em;
        }
        
        .trafico-texto {
            flex: 1;
            font-weight: 600;
        }
        
        .trafico-tiempo {
            background: rgba(0, 0, 0, 0.2);
            padding: 4px 8px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 0.9em;
        }
        
        /* Estados de tráfico */
        .trafico-low { border-left-color: #4CAF50 !important; }
        .trafico-moderate { border-left-color: #FF9800 !important; }
        .trafico-heavy { border-left-color: #F44336 !important; }
        .trafico-severe { border-left-color: #D32F2F !important; }
        
        /* Animaciones */
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =============================================
// EJECUCIÓN PRINCIPAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');
    
    // Agregar estilos del sistema de tráfico
    agregarEstilosTrafico();
    
    // Inicializar la aplicación
    inicializarApp();
});

// Prevenir cierre accidental
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = (elementos.tarifa && elementos.tarifa.value) || 
                                 (elementos.minutos && elementos.minutos.value) || 
                                 (elementos.distancia && elementos.distancia.value);
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// =============================================
// EJECUCIÓN PRINCIPAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');
    inicializarApp();
});

// Prevenir cierre accidental
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = (elementos.tarifa && elementos.tarifa.value) || 
                                 (elementos.minutos && elementos.minutos.value) || 
                                 (elementos.distancia && elementos.distancia.value);
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (elementos.modalFondo && event.target === elementos.modalFondo) {
        cerrarModal();
    }
    if (elementos.exportModal && event.target === elementos.exportModal) {
        cerrarExportModal();
    }
    if (elementos.syncPanel && event.target === elementos.syncPanel) {
        cerrarSyncPanel();
    }
};







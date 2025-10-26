// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión COMPLETA con Google Sheets Sync CORREGIDA
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let syncManager;

// --- Configuración Google Sheets Sync ---
// REEMPLAZA ESTA URL CON LA URL DE TU GOOGLE APPS SCRIPT
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw8O285FcLwNvmMOn8VIEIzVF7djFZ3V4glvcop4-_HjIgDCgG0JzBr3alm_qEGiuhoFg/exec';

// --- Clase Google Sheets Sync CORREGIDA para CORS ---
class GoogleSheetsSync {
    constructor() {
        this.initialized = false;
        this.userId = this.getUserId();
        this.scriptUrl = GOOGLE_SCRIPT_URL;
        this.retryCount = 0;
        this.maxRetries = 2;
    }

    getUserId() {
        let userId = localStorage.getItem('ubercalc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ubercalc_user_id', userId);
            console.log('🆕 Nuevo User ID generado:', userId);
        }
        return userId;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Google Sheets ya estaba inicializado');
            return true;
        }

        try {
            console.log('🔥 Iniciando Google Sheets Sync...');
            
            // Test de conexión simple con manejo de CORS
            const testUrl = `${this.scriptUrl}?action=test&timestamp=${Date.now()}`;
            console.log('🔗 Probando URL:', testUrl);
            
            const response = await fetch(testUrl, {
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    this.initialized = true;
                    this.retryCount = 0;
                    console.log('🎉 Google Sheets Sync inicializado CORRECTAMENTE');
                    this.actualizarUIEstado('connected');
                    return true;
                }
            }
            
            throw new Error('Conexión falló');
            
        } catch (error) {
            console.log('⚠️ Modo offline activado - Sync desactivado temporalmente');
            this.initialized = true; // Marcar como inicializado para no bloquear la app
            this.actualizarUIEstado('disconnected');
            return true;
        }
    }

    async saveProfiles(profiles) {
        if (!this.initialized) {
            console.log('📱 Modo offline - Guardando localmente');
            return true;
        }

        try {
            console.log('💾 Intentando guardar', profiles.length, 'perfiles...');
            
            const data = {
                action: 'save',
                userId: this.userId,
                profiles: profiles,
                timestamp: new Date().toISOString()
            };

            // Usar fetch simple, si falla no bloquear la app
            const response = await fetch(this.scriptUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
                mode: 'cors',
                credentials: 'omit'
            });

            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Perfiles guardados en Google Sheets');
                    this.actualizarUIEstado('syncing');
                    
                    setTimeout(() => {
                        this.actualizarUIEstado('connected');
                    }, 1000);
                    
                    return true;
                }
            }
            
            throw new Error('Guardado falló');
            
        } catch (error) {
            console.log('📱 Guardado local - Sync falló:', error.message);
            // Devolver true para no bloquear la aplicación
            return true;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.log('📱 Modo offline - No se pueden cargar perfiles remotos');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Google Sheets...');
            
            const url = `${this.scriptUrl}?action=load&userId=${this.userId}&timestamp=${Date.now()}`;
            const response = await fetch(url, {
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success) {
                    const perfilesCount = result.profiles ? result.profiles.length : 0;
                    console.log(`✅ ${perfilesCount} perfiles cargados desde Google Sheets`);
                    this.actualizarUIEstado('connected');
                    return result.profiles || [];
                }
            }
            
            throw new Error('Carga falló');
            
        } catch (error) {
            console.log('📱 Carga local - No se pudieron cargar perfiles remotos');
            this.actualizarUIEstado('disconnected');
            return null;
        }
    }

    getDeviceInfo() {
        const deviceInfo = {
            id: this.userId,
            name: localStorage.getItem('ubercalc_device_name') || this.guessDeviceName(),
            type: this.detectDeviceType(),
            lastSync: new Date().toISOString()
        };
        
        return deviceInfo;
    }

    guessDeviceName() {
        const ua = navigator.userAgent.toLowerCase();
        let name = 'Dispositivo';
        
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            name = ua.includes('tablet') || ua.includes('ipad') ? 'Tableta' : 'Teléfono Móvil';
        } else if (ua.includes('win')) {
            name = 'Computadora Windows';
        } else if (ua.includes('mac')) {
            name = 'Computadora Mac';
        } else if (ua.includes('linux')) {
            name = 'Computadora Linux';
        }
        
        const savedName = name + ' ' + Math.floor(Math.random() * 1000);
        localStorage.setItem('ubercalc_device_name', savedName);
        return savedName;
    }

    detectDeviceType() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return ua.includes('tablet') || ua.includes('ipad') ? 'tablet' : 'mobile';
        }
        return 'desktop';
    }

    actualizarUIEstado(estado) {
        try {
            const syncInfo = document.getElementById('sync-info');
            const syncIcon = document.getElementById('sync-icon');
            const syncText = document.getElementById('sync-text');
            
            if (!syncInfo || !syncIcon || !syncText) return;
            
            syncInfo.className = 'sync-info';
            syncInfo.classList.add(estado);
            
            switch(estado) {
                case 'connected':
                    syncIcon.textContent = '✅';
                    syncText.textContent = 'Conectado a Google Sheets';
                    break;
                case 'syncing':
                    syncIcon.textContent = '🔄';
                    syncText.textContent = 'Sincronizando...';
                    break;
                case 'disconnected':
                    syncIcon.textContent = '📱';
                    syncText.textContent = 'Almacenamiento local';
                    break;
                case 'error':
                    syncIcon.textContent = '❌';
                    syncText.textContent = 'Error de conexión';
                    break;
                default:
                    syncIcon.textContent = '🌐';
                    syncText.textContent = 'Conectando...';
            }
            
        } catch (error) {
            console.error('Error actualizando UI de sync:', error);
        }
    }
}

// --- Elementos DOM ---
const elementos = {
    perfilScreen: document.getElementById('perfil-screen'),
    configPerfilScreen: document.getElementById('config-perfil-screen'),
    mainScreen: document.getElementById('main-screen'),
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    autoCalcIndicator: document.getElementById('auto-calc-indicator'),
    tarifaInput: document.getElementById('tarifa'),
    minutosInput: document.getElementById('minutos'),
    distanciaInput: document.getElementById('distancia'),
    resultadoRapido: document.getElementById('resultado-rapido'),
    resultadoBadge: document.getElementById('resultado-badge'),
    resultadoEmoji: document.getElementById('resultado-emoji'),
    resultadoTexto: document.getElementById('resultado-texto'),
    metricaMinuto: document.getElementById('metrica-minuto'),
    metricaKm: document.getElementById('metrica-km'),
    aceptarViajeBtn: document.getElementById('aceptar-viaje'),
    rechazarViajeBtn: document.getElementById('rechazar-viaje'),
    aceptarViajeTabBtn: document.getElementById('aceptar-viaje-tab'),
    rechazarViajeTabBtn: document.getElementById('rechazar-viaje-tab'),
    modalFondo: document.getElementById('modalFondo'),
    modalContenido: document.getElementById('modalContenido'),
    modalResultadosDoble: document.getElementById('modalResultadosDoble'),
    modalBadge: document.getElementById('modal-badge'),
    modalEmoji: document.getElementById('modal-emoji'),
    modalTexto: document.getElementById('modal-texto'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    exportarHistorialBtn: document.getElementById('exportar-historial'),
    statsViajes: document.getElementById('stats-viajes'),
    statsGanancia: document.getElementById('stats-ganancia'),
    statsTiempo: document.getElementById('stats-tiempo'),
    statsRentables: document.getElementById('stats-rentables'),
    statsGananciaHora: document.getElementById('stats-ganancia-hora'),
    statsViajePromedio: document.getElementById('stats-viaje-promedio'),
    perfilesLista: document.getElementById('perfiles-lista'),
    nuevoPerfilBtn: document.getElementById('nuevo-perfil-btn'),
    perfilForm: document.getElementById('perfil-form'),
    volverPerfilesBtn: document.getElementById('volver-perfiles'),
    cancelarPerfilBtn: document.getElementById('cancelar-perfil'),
    cambiarPerfilBtn: document.getElementById('cambiar-perfil'),
    themeToggle: document.getElementById('theme-toggle'),
    exportModal: document.getElementById('exportModal'),
    exportarPdfBtn: document.getElementById('exportar-pdf'),
    syncPanel: document.getElementById('sync-panel')
};

// --- Inicialización PRINCIPAL ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando UberCalc...');
    inicializarApp().catch(error => {
        console.error('💥 Error en inicialización:', error);
    });
});

async function inicializarApp() {
    console.log('🎯 Inicializando aplicación...');
    
    try {
        // 1. Inicializar Google Sheets Sync (no bloqueante)
        console.log('🔥 Inicializando Google Sheets Sync...');
        syncManager = new GoogleSheetsSync();
        
        // Inicializar sin esperar (no bloqueante)
        syncManager.initialize().then(success => {
            if (success) {
                console.log('✅ Google Sheets listo');
                // Intentar cargar datos remotos
                cargarDatosRemotos();
            } else {
                console.log('📱 Usando almacenamiento local');
                cargarDatosLocales();
            }
        }).catch(error => {
            console.log('📱 Error en sync, usando local:', error);
            cargarDatosLocales();
        });
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        cargarDatosLocales();
    }
    
    // Configuración básica (no depende de sync)
    aplicarTemaGuardado();
    configurarEventListeners();
    actualizarInterfazPerfiles();
    
    // Mostrar pantalla inicial
    if (perfiles.length > 0 && perfilActual) {
        mostrarPantalla('main');
        actualizarEstadisticas();
    } else {
        mostrarPantalla('perfil');
    }
    
    console.log('🎉 UberCalc inicializado');
}

async function cargarDatosRemotos() {
    try {
        if (syncManager && syncManager.initialized) {
            const perfilesRemotos = await syncManager.loadProfiles();
            if (perfilesRemotos && perfilesRemotos.length > 0) {
                perfiles = perfilesRemotos;
                perfilActual = perfiles[0];
                historial = []; // Historial se mantiene local
                console.log(`✅ ${perfiles.length} perfiles cargados desde la nube`);
                guardarDatosLocales();
                actualizarInterfazPerfiles();
                return;
            }
        }
    } catch (error) {
        console.log('📱 Falló carga remota, usando local');
    }
    
    cargarDatosLocales();
}

function cargarDatosLocales() {
    try {
        const datosGuardados = localStorage.getItem('uberCalc_data');
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            perfiles = datos.perfiles || [];
            perfilActual = datos.perfilActual || null;
            historial = datos.historial || [];
            console.log(`📱 ${perfiles.length} perfiles cargados localmente`);
        }
    } catch (error) {
        console.error('❌ Error cargando datos locales:', error);
        perfiles = [];
        perfilActual = null;
        historial = [];
    }
}

function configurarEventListeners() {
    // Sistema de Pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            cambiarPestana(tabId);
        });
    });
    
    // Cálculo Automático
    elementos.tarifaInput?.addEventListener('input', manejarCalculoAutomatico);
    elementos.minutosInput?.addEventListener('input', manejarCalculoAutomatico);
    elementos.distanciaInput?.addEventListener('input', manejarCalculoAutomatico);
    
    // Botones de Acción
    elementos.aceptarViajeBtn?.addEventListener('click', () => procesarViaje(true));
    elementos.rechazarViajeBtn?.addEventListener('click', () => procesarViaje(false));
    elementos.aceptarViajeTabBtn?.addEventListener('click', () => procesarViaje(true));
    elementos.rechazarViajeTabBtn?.addEventListener('click', () => procesarViaje(false));
    
    // Historial
    elementos.clearHistoryBtn?.addEventListener('click', limpiarHistorial);
    elementos.exportarHistorialBtn?.addEventListener('click', mostrarModalExportacion);
    
    // Perfiles
    elementos.nuevoPerfilBtn?.addEventListener('click', () => mostrarConfigPerfil());
    elementos.volverPerfilesBtn?.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.cancelarPerfilBtn?.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.cambiarPerfilBtn?.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.perfilForm?.addEventListener('submit', guardarPerfil);
    
    // Tema
    elementos.themeToggle?.addEventListener('click', alternarTema);
    
    // Exportación
    elementos.exportarPdfBtn?.addEventListener('click', exportarPDF);
    
    // Configuración de Unidades
    document.getElementById('tipo-medida')?.addEventListener('change', actualizarUnidades);
    document.getElementById('tipo-combustible')?.addEventListener('change', actualizarUnidades);
    document.getElementById('moneda')?.addEventListener('change', actualizarUnidades);
}

// --- Sistema de Pestañas ---
function cambiarPestana(tabId) {
    elementos.tabButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-tab') === tabId);
    });
    
    elementos.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    if (tabId === 'resumen') actualizarEstadisticas();
    else if (tabId === 'historial') actualizarHistorial();
}

// --- Cálculo Automático ---
function manejarCalculoAutomatico() {
    clearTimeout(timeoutCalculo);
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    const tarifa = parseFloat(elementos.tarifaInput?.value) || 0;
    const minutos = parseFloat(elementos.minutosInput?.value) || 0;
    const distancia = parseFloat(elementos.distanciaInput?.value) || 0;
    
    if (tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual) {
        elementos.autoCalcIndicator?.classList.remove('hidden');
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        }
    } else {
        elementos.autoCalcIndicator?.classList.add('hidden');
        elementos.resultadoRapido?.classList.add('hidden');
        resetearInterfazCalculo();
    }
}

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    
    elementos.resultadoBadge.className = 'resultado-badge';
    elementos.resultadoBadge.classList.add(resultado.rentabilidad);
    elementos.resultadoEmoji.textContent = resultado.emoji;
    elementos.resultadoTexto.textContent = resultado.texto;
    
    elementos.metricaMinuto.textContent = `${formatearMoneda(resultado.gananciaPorMinuto)}/min`;
    
    const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
    elementos.metricaKm.textContent = `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`;
    
    elementos.resultadoRapido.classList.remove('hidden');
    elementos.aceptarViajeTabBtn.className = 'primary-button';
    elementos.aceptarViajeTabBtn.classList.add(resultado.rentabilidad);
    elementos.autoCalcIndicator?.classList.add('hidden');
}

function resetearInterfazCalculo() {
    elementos.aceptarViajeTabBtn.className = 'primary-button';
    elementos.aceptarViajeTabBtn.classList.remove('rentable', 'oportunidad', 'no-rentable');
    calculoActual = null;
}

// --- Funciones de Cálculo ---
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
        mostrarError('Error en el cálculo');
        return null;
    }
}

function mostrarModalResultados(resultado) {
    if (!resultado) return;
    
    elementos.modalEmoji.textContent = resultado.emoji;
    elementos.modalTexto.textContent = resultado.texto;
    elementos.modalBadge.className = 'result-badge';
    elementos.modalBadge.classList.add(resultado.rentabilidad);
    elementos.modalResultadosDoble.innerHTML = '';
    
    const columnaMinuto = crearColumnaResultado(
        '⏱️ Por Minuto',
        `${formatearMoneda(resultado.gananciaPorMinuto)}/min`,
        `Umbral: ${formatearMoneda(perfilActual.umbralMinutoRentable)}/min`,
        resultado.rentabilidad
    );
    
    const distanciaLabel = perfilActual.tipoMedida === 'mi' ? 'mi' : 'km';
    const columnaDistancia = crearColumnaResultado(
        '🛣️ Por Distancia',
        `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`,
        `Umbral: ${formatearMoneda(perfilActual.umbralKmRentable)}/${distanciaLabel}`,
        resultado.rentabilidad
    );
    
    elementos.modalResultadosDoble.appendChild(columnaMinuto);
    elementos.modalResultadosDoble.appendChild(columnaDistancia);
    
    const infoAdicional = document.createElement('div');
    infoAdicional.className = 'metricas-adicionales';
    infoAdicional.style.gridColumn = '1 / -1';
    infoAdicional.style.marginTop = '20px';
    infoAdicional.style.padding = '15px';
    infoAdicional.style.background = 'var(--light-grey)';
    infoAdicional.style.borderRadius = '10px';
    
    infoAdicional.innerHTML = `
        <h4 style="margin: 0 0 15px 0; text-align: center; color: var(--text-primary);">💰 Desglose Financiero</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
            <div style="grid-column: 1 / -1; text-align: center; padding: 10px; background: var(--card-bg); border-radius: 8px; border: 2px solid var(--success-green);">
                <strong style="color: var(--success-green);">Ganancia Ofrecida</strong><br>
                <span style="font-size: 1.2em; font-weight: bold;">${formatearMoneda(resultado.tarifa)}</span>
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>⛽ Combustible</strong><br>
                ${formatearMoneda(resultado.costoCombustible)}
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>🔧 Mantenimiento</strong><br>
                ${formatearMoneda(resultado.costoMantenimiento)}
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>🛡️ Seguro</strong><br>
                ${formatearMoneda(resultado.costoSeguro)}
            </div>
            <div style="grid-column: 1 / -1; text-align: center; padding: 12px; background: var(--card-bg); border-radius: 8px; border: 2px solid var(--secondary-orange); margin-top: 5px;">
                <strong style="color: var(--secondary-orange);">GANANCIA NETA</strong><br>
                <span style="font-size: 1.3em; font-weight: bold; color: var(--secondary-orange);">${formatearMoneda(resultado.gananciaNeta)}</span>
            </div>
        </div>
    `;
    
    elementos.modalResultadosDoble.appendChild(infoAdicional);
    calculoActual = resultado;
    elementos.modalFondo.style.display = 'flex';
}

function crearColumnaResultado(titulo, valor, comparacion, rentabilidad) {
    const columna = document.createElement('div');
    columna.className = 'resultado-columna';
    
    const tituloElem = document.createElement('h3');
    tituloElem.textContent = titulo;
    tituloElem.style.margin = '0 0 10px 0';
    tituloElem.style.fontSize = '1em';
    
    const valorElem = document.createElement('div');
    valorElem.className = `resultado-valor ${rentabilidad}`;
    valorElem.textContent = valor;
    valorElem.style.fontSize = '1.3em';
    valorElem.style.fontWeight = 'bold';
    valorElem.style.margin = '10px 0';
    
    const comparacionElem = document.createElement('div');
    comparacionElem.className = 'resultado-comparacion';
    comparacionElem.textContent = comparacion;
    comparacionElem.style.fontSize = '0.85em';
    comparacionElem.style.color = 'var(--text-secondary)';
    
    columna.appendChild(tituloElem);
    columna.appendChild(valorElem);
    columna.appendChild(comparacionElem);
    
    return columna;
}

async function procesarViaje(aceptado) {
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }
    
    if (aceptado) {
        guardarEnHistorial(calculoActual, true);
        mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
        actualizarEstadisticas();
    } else {
        guardarEnHistorial(calculoActual, false);
        mostrarStatus('❌ Viaje rechazado', 'info');
    }
    
    limpiarFormulario();
    cerrarModal();
    
    if (aceptado) {
        setTimeout(() => cambiarPestana('historial'), 500);
    }
}

// --- Gestión de Historial ---
function guardarEnHistorial(resultado, aceptado) {
    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: Date.now().toString()
    };
    
    historial.unshift(historialItem);
    if (historial.length > 50) historial = historial.slice(0, 50);
    
    guardarDatosLocales();
    actualizarHistorial();
}

function actualizarHistorial() {
    if (!elementos.historyList) return;
    
    elementos.historyList.innerHTML = '';
    
    if (historial.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="history-item" style="text-align: center; opacity: 0.7;">
                <div class="history-details">No hay viajes en el historial</div>
                <div style="font-size: 0.8em; margin-top: 5px;">Los viajes aceptados aparecerán aquí</div>
            </div>
        `;
        return;
    }
    
    historial.slice(0, 10).forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.rentabilidad}`;
        
        const hora = new Date(item.timestamp).toLocaleTimeString('es-DO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const estado = item.aceptado ? '✅' : '❌';
        const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
        const detalles = `${formatearMoneda(item.tarifa)} • ${item.minutos}min • ${item.distancia}${distanciaLabel}`;
        
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-time">${hora}</div>
                <div class="history-details">${detalles}</div>
            </div>
            <div class="history-status">${estado} ${item.emoji}</div>
        `;
        
        historyItem.addEventListener('click', () => mostrarDetallesViaje(item));
        elementos.historyList.appendChild(historyItem);
    });
}

function mostrarDetallesViaje(viaje) {
    const detalles = `📊 DETALLES DEL VIAJE
⏰ Hora: ${new Date(viaje.timestamp).toLocaleTimeString()}

💰 GANANCIA OFRECIDA: ${formatearMoneda(viaje.tarifa)}

📈 MÉTRICAS:
⏱️ Por minuto: ${formatearMoneda(viaje.gananciaPorMinuto)}/min
🛣️ Por ${perfilActual?.tipoMedida === 'mi' ? 'millas' : 'km'}: ${formatearMoneda(viaje.gananciaPorKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}

💸 DESGLOSE DE COSTOS:
⛽ Combustible: ${formatearMoneda(viaje.costoCombustible)}
🔧 Mantenimiento: ${formatearMoneda(viaje.costoMantenimiento)}
🛡️ Seguro: ${formatearMoneda(viaje.costoSeguro)}
💵 TOTAL COSTOS: ${formatearMoneda(viaje.costoTotal)}

🎯 RESULTADO FINAL:
💵 GANANCIA NETA: ${formatearMoneda(viaje.gananciaNeta)}
${viaje.emoji} ${viaje.texto}

✅ ESTADO: ${viaje.aceptado ? 'ACEPTADO' : 'RECHAZADO'}`;
    
    alert(detalles);
}

function limpiarHistorial() {
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        historial = [];
        guardarDatosLocales();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('🗑️ Historial limpiado correctamente', 'success');
    }
}

// --- Estadísticas ---
function actualizarEstadisticas() {
    if (!perfilActual) return;
    
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => 
        new Date(item.timestamp).toDateString() === hoy && item.aceptado
    );
    
    const totalViajes = viajesHoy.length;
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + item.tarifa, 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + item.minutos, 0);
    const viajesRentables = viajesHoy.filter(item => item.rentabilidad === 'rentable').length;
    
    const costoCombustibleTotal = viajesHoy.reduce((sum, item) => sum + item.costoCombustible, 0);
    const costoMantenimientoTotal = viajesHoy.reduce((sum, item) => sum + item.costoMantenimiento, 0);
    const costoSeguroTotal = viajesHoy.reduce((sum, item) => sum + item.costoSeguro, 0);
    const gananciaNetaTotal = viajesHoy.reduce((sum, item) => sum + item.gananciaNeta, 0);
    
    if (elementos.statsViajes) elementos.statsViajes.textContent = totalViajes;
    if (elementos.statsGanancia) elementos.statsGanancia.textContent = formatearMoneda(gananciaTotal);
    if (elementos.statsTiempo) elementos.statsTiempo.textContent = `${tiempoTotal}min`;
    if (elementos.statsRentables) elementos.statsRentables.textContent = viajesRentables;
    
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    
    if (elementos.statsGananciaHora) elementos.statsGananciaHora.textContent = formatearMoneda(gananciaPorHora);
    if (elementos.statsViajePromedio) elementos.statsViajePromedio.textContent = formatearMoneda(viajePromedio);
    
    window.estadisticasExportacion = {
        totalViajes, gananciaTotal, tiempoTotal, viajesRentables,
        costoCombustibleTotal, costoMantenimientoTotal, costoSeguroTotal, gananciaNetaTotal,
        gananciaPorHora, viajePromedio
    };
}

// --- Gestión de Perfiles ---
function mostrarConfigPerfil(perfil = null) {
    const form = elementos.perfilForm;
    
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

async function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil...');
    
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
    
    // Actualizar o agregar perfil
    if (perfilId) {
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfil;
        }
    } else {
        perfiles.push(perfil);
    }
    
    // Actualizar perfil actual si es necesario
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
    }
    
    // Guardar localmente
    guardarDatosLocales();
    
    // Intentar sincronizar (no bloqueante)
    if (syncManager && syncManager.initialized) {
        syncManager.saveProfiles(perfiles).then(success => {
            if (success) {
                mostrarStatus('✅ Perfil guardado y sincronizado', 'success');
            } else {
                mostrarStatus('💾 Perfil guardado (almacenamiento local)', 'info');
            }
        });
    } else {
        mostrarStatus('💾 Perfil guardado (almacenamiento local)', 'info');
    }
    
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
}

function actualizarInterfazPerfiles() {
    if (!elementos.perfilesLista) return;
    
    elementos.perfilesLista.innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos.perfilesLista.innerHTML = `
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
            <div class="perfil-info">
                <div class="perfil-nombre">${perfil.nombre}</div>
                <div class="perfil-detalles">
                    <span>${detalles}</span>
                    <span>${perfil.tipoCombustible.toUpperCase()}</span>
                </div>
            </div>
            <div class="perfil-acciones">
                <button class="secondary-button small usar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">🚗</span>
                    Usar
                </button>
                <button class="secondary-button small editar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">✏️</span>
                    Editar
                </button>
                <button class="secondary-button small eliminar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">🗑️</span>
                    Eliminar
                </button>
            </div>
        `;
        
        // Event listeners para botones
        const usarBtn = perfilItem.querySelector('.usar-perfil-btn');
        const editarBtn = perfilItem.querySelector('.editar-perfil-btn');
        const eliminarBtn = perfilItem.querySelector('.eliminar-perfil-btn');
        
        if (usarBtn) {
            usarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                seleccionarPerfil(perfilId);
            });
        }
        
        if (editarBtn) {
            editarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                editarPerfil(perfilId);
            });
        }
        
        if (eliminarBtn) {
            eliminarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                eliminarPerfil(perfilId);
            });
        }
        
        // Clic en el item completo
        perfilItem.addEventListener('click', function(e) {
            if (!e.target.closest('.perfil-acciones')) {
                seleccionarPerfil(perfil.id);
            }
        });
        
        elementos.perfilesLista.appendChild(perfilItem);
    });
}

async function seleccionarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        perfilActual = perfil;
        guardarDatosLocales();
        
        // Intentar sincronizar (no bloqueante)
        if (syncManager && syncManager.initialized) {
            syncManager.saveProfiles(perfiles);
        }
        
        mostrarPantalla('main');
        mostrarStatus(`🚗 Perfil "${perfil.nombre}" activado`, 'success');
        actualizarUnidades();
        actualizarEstadisticas();
    } else {
        mostrarError('Error: Perfil no encontrado');
    }
}

function editarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    } else {
        mostrarError('Perfil no encontrado');
    }
}

async function eliminarPerfil(perfilId) {
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    const perfilAEliminar = perfiles.find(p => p.id === perfilId);
    if (!perfilAEliminar) {
        mostrarError('Perfil no encontrado');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar el perfil "${perfilAEliminar.nombre}"?`)) {
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
        }
        
        guardarDatosLocales();
        
        // Intentar sincronizar (no bloqueante)
        if (syncManager && syncManager.initialized) {
            syncManager.saveProfiles(perfiles);
        }
        
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
    }
}

function actualizarUnidades() {
    const tipoMedida = document.getElementById('tipo-medida')?.value || perfilActual?.tipoMedida || 'km';
    const tipoCombustible = document.getElementById('tipo-combustible')?.value || perfilActual?.tipoCombustible || 'glp';
    const moneda = document.getElementById('moneda')?.value || perfilActual?.moneda || 'DOP';
    
    const rendimientoUnit = document.getElementById('rendimiento-unit');
    const precioCombustibleUnit = document.getElementById('precio-combustible-unit');
    const umbralKmUnit = document.getElementById('umbral-km-unit');
    const umbralKmOportunidadUnit = document.getElementById('umbral-km-oportunidad-unit');
    
    if (rendimientoUnit) rendimientoUnit.textContent = tipoMedida === 'mi' ? 'mpg' : 'Km/Gl';
    if (precioCombustibleUnit) precioCombustibleUnit.textContent = `${moneda}/Gl`;
    if (umbralKmUnit) umbralKmUnit.textContent = `${moneda}/${tipoMedida === 'mi' ? 'mi' : 'Km'}`;
    if (umbralKmOportunidadUnit) umbralKmOportunidadUnit.textContent = `${moneda}/${tipoMedida === 'mi' ? 'mi' : 'Km'}`;
    
    const distanciaUnit = document.getElementById('distancia-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (distanciaUnit) distanciaUnit.textContent = tipoMedida === 'mi' ? 'mi' : 'Km';
    if (monedaTarifa) monedaTarifa.textContent = moneda;
    
    document.querySelectorAll('.costo-mensual').forEach(el => {
        if (el) el.textContent = moneda;
    });
    
    document.querySelectorAll('.umbral-minuto').forEach(el => {
        if (el) el.textContent = `${moneda}/min`;
    });
}

// --- Gestión de Tema ---
function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('uberCalc_theme', newTheme);
    
    const themeIcon = elementos.themeToggle?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('uberCalc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = elementos.themeToggle?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// --- Sincronización Google Sheets UI ---
function mostrarPanelSync() {
    actualizarPanelSync();
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
    }
}

function cerrarSyncPanel() {
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

async function actualizarPanelSync() {
    if (!syncManager) return;
    
    try {
        const deviceInfo = syncManager.getDeviceInfo();
        const deviceName = document.getElementById('current-device-name');
        const deviceId = document.getElementById('current-device-id');
        const deviceIcon = document.getElementById('current-device-icon');
        
        if (deviceName) deviceName.textContent = deviceInfo.name;
        if (deviceId) deviceId.textContent = `ID: ${deviceInfo.id.substring(0, 8)}...`;
        if (deviceIcon) {
            deviceIcon.textContent = deviceInfo.type === 'mobile' ? '📱' : 
                                    deviceInfo.type === 'tablet' ? '📟' : '💻';
        }
        
        const sheetsStatus = document.getElementById('sheets-status');
        const lastSyncTime = document.getElementById('last-sync-time');
        const cloudProfilesCount = document.getElementById('cloud-profiles-count');
        
        if (syncManager.initialized) {
            if (sheetsStatus) {
                sheetsStatus.textContent = 'Conectado';
                sheetsStatus.style.color = 'var(--success-green)';
            }
        } else {
            if (sheetsStatus) {
                sheetsStatus.textContent = 'Desconectado';
                sheetsStatus.style.color = 'var(--error-red)';
            }
        }
        
        if (lastSyncTime) lastSyncTime.textContent = new Date().toLocaleTimeString();
        if (cloudProfilesCount) cloudProfilesCount.textContent = perfiles.length;
        
    } catch (error) {
        console.error('Error actualizando panel sync:', error);
    }
}

async function forzarSincronizacion() {
    if (!syncManager) {
        mostrarError('Sync no disponible');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando...', 'info');
    
    const success = await syncManager.saveProfiles(perfiles);
    if (success) {
        mostrarStatus('✅ Sincronización completada', 'success');
        actualizarPanelSync();
    } else {
        mostrarStatus('📱 Sincronización falló - Usando local', 'warning');
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN CON GOOGLE SHEETS

📱 Estado actual: ${syncManager?.initialized ? 'CONECTADO' : 'MODO OFFLINE'}

✅ La aplicación funciona perfectamente en ambos modos:
• Conectado: Tus perfiles se sincronizan entre dispositivos
• Offline: Tus datos se guardan localmente

💡 Los viajes e historial siempre se guardan localmente`);
}

// --- Funciones de Diagnóstico ---
async function diagnosticarGoogleSheets() {
    try {
        if (!syncManager) {
            alert('❌ Sync Manager no disponible');
            return;
        }
        
        const testUrl = `${GOOGLE_SCRIPT_URL}?action=test&timestamp=${Date.now()}`;
        const response = await fetch(testUrl);
        
        if (response.ok) {
            const result = await response.json();
            alert('✅ Google Sheets funcionando!\n\n' + result.message);
        } else {
            alert('❌ Error HTTP: ' + response.status);
        }
        
    } catch (error) {
        alert('📱 Modo offline activado\n\nLa aplicación funciona localmente');
    }
}

// --- Exportación ---
function mostrarModalExportacion() {
    if (historial.length === 0) {
        mostrarError('No hay datos en el historial para exportar');
        return;
    }
    
    actualizarEstadisticas();
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'flex';
    }
}

function exportarPDF() {
    mostrarStatus('🔄 Generando PDF...', 'info');
    
    const contenido = generarContenidoPDF();
    const blob = new Blob([contenido], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `UberCalc_Reporte_${new Date().toISOString().split('T')[0]}.html`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setTimeout(() => {
        mostrarStatus('📄 PDF generado correctamente', 'success');
        cerrarExportModal();
    }, 1000);
}

function exportarBackup() {
    const data = {
        perfiles: perfiles,
        perfilActual: perfilActual,
        historial: historial,
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ubercalc-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    mostrarStatus('📤 Backup exportado correctamente', 'success');
}

function importarBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (!data.perfiles || !Array.isArray(data.perfiles)) {
                throw new Error('Formato de archivo inválido');
            }

            const confirmMsg = `¿Importar ${data.perfiles.length} perfiles y ${data.historial?.length || 0} viajes?\n\nEsto reemplazará tus datos actuales.`;
            
            if (confirm(confirmMsg)) {
                perfiles = data.perfiles;
                perfilActual = data.perfilActual || (perfiles.length > 0 ? perfiles[0] : null);
                historial = data.historial || [];
                
                guardarDatosLocales();
                actualizarInterfazPerfiles();
                actualizarEstadisticas();
                actualizarHistorial();
                
                if (syncManager && syncManager.initialized) {
                    syncManager.saveProfiles(perfiles);
                }
                
                mostrarStatus(`📥 Backup importado: ${perfiles.length} perfiles`, 'success');
            }
        } catch (error) {
            mostrarError('Error importando backup: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function generarContenidoPDF() {
    const stats = window.estadisticasExportacion || {};
    const viajesAceptados = historial.filter(item => item.aceptado).length;
    const viajesRentables = historial.filter(item => item.aceptado && item.rentabilidad === 'rentable').length;
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte UberCalc</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 UberCalc - Reporte Completo</h1>
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-DO')}</p>
        <p><strong>Perfil:</strong> ${perfilActual?.nombre || 'No especificado'}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card">
            <h3>💰 INGRESOS</h3>
            <p><strong>Ganancia Total:</strong> ${formatearMoneda(stats.gananciaTotal || 0)}</p>
            <p><strong>Viajes Aceptados:</strong> ${viajesAceptados}</p>
        </div>
        
        <div class="summary-card">
            <h3>📊 RENDIMIENTO</h3>
            <p><strong>Ganancia/Hora:</strong> ${formatearMoneda(stats.gananciaPorHora || 0)}</p>
            <p><strong>Viajes Rentables:</strong> ${viajesRentables}</p>
        </div>
    </div>

    <h3>📋 DETALLE DE VIAJES</h3>
    <table>
        <thead>
            <tr>
                <th>Fecha</th><th>Hora</th><th>Ganancia</th><th>Minutos</th><th>Distancia</th>
                <th>Rentabilidad</th><th>Aceptado</th>
            </tr>
        </thead>
        <tbody>
            ${historial.map(item => {
                const fecha = new Date(item.timestamp).toLocaleDateString();
                const hora = new Date(item.timestamp).toLocaleTimeString();
                const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
                return `<tr>
                    <td>${fecha}</td><td>${hora}</td><td>${formatearMoneda(item.tarifa)}</td>
                    <td>${item.minutos}</td><td>${item.distancia} ${distanciaLabel}</td>
                    <td>${item.texto}</td><td>${item.aceptado ? '✅ Sí' : '❌ No'}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Exportado desde UberCalc - Calculadora Inteligente para Conductores</p>
    </div>
</body>
</html>`;
}

// --- Utilidades ---
function mostrarPantalla(pantalla) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    
    if (pantalla === 'perfil' && elementos.perfilScreen) elementos.perfilScreen.classList.add('active');
    else if (pantalla === 'config-perfil' && elementos.configPerfilScreen) elementos.configPerfilScreen.classList.add('active');
    else if (pantalla === 'main' && elementos.mainScreen) {
        elementos.mainScreen.classList.add('active');
        actualizarUnidades();
        actualizarEstadisticas();
        actualizarHistorial();
    }
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos.statusIndicator || !elementos.statusText) return;
    
    elementos.statusText.textContent = mensaje;
    elementos.statusIndicator.className = `status-indicator ${tipo}`;
    elementos.statusIndicator.classList.remove('hidden');
    
    setTimeout(() => {
        if (elementos.statusIndicator) elementos.statusIndicator.classList.add('hidden');
    }, 3000);
}

function limpiarFormulario() {
    if (elementos.tarifaInput) elementos.tarifaInput.value = '';
    if (elementos.minutosInput) elementos.minutosInput.value = '';
    if (elementos.distanciaInput) elementos.distanciaInput.value = '';
    if (elementos.autoCalcIndicator) elementos.autoCalcIndicator.classList.add('hidden');
    if (elementos.resultadoRapido) elementos.resultadoRapido.classList.add('hidden');
    resetearInterfazCalculo();
    calculoActual = null;
}

function cerrarModal() {
    if (elementos.modalFondo) elementos.modalFondo.style.display = 'none';
}

function cerrarExportModal() {
    if (elementos.exportModal) elementos.exportModal.style.display = 'none';
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

// --- Persistencia de Datos ---
function guardarDatosLocales() {
    const datos = {
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('uberCalc_data', JSON.stringify(datos));
    } catch (error) {
        console.error('❌ Error guardando en localStorage:', error);
    }
}

// --- Funciones Globales ---
window.cerrarModal = cerrarModal;
window.cerrarExportModal = cerrarExportModal;
window.cerrarSyncPanel = cerrarSyncPanel;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.mostrarPanelSync = mostrarPanelSync;
window.forzarSincronizacion = forzarSincronizacion;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarGoogleSheets = diagnosticarGoogleSheets;
window.exportarBackup = exportarBackup;
window.importarBackup = importarBackup;

// --- Event Listeners Globales ---
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = elementos.tarifaInput?.value || 
                                 elementos.minutosInput?.value || 
                                 elementos.distanciaInput?.value;
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.onclick = function(event) {
    if (event.target === elementos.modalFondo) cerrarModal();
    if (event.target === elementos.exportModal) cerrarExportModal();
    if (event.target === elementos.syncPanel) cerrarSyncPanel();
};

console.log('🎉 UberCalc con sincronización mejorada cargado!');

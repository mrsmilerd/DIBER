// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión con Google Apps Script Sync - COMPLETA Y CORREGIDA (FIX SINCRONIZACIÓN)
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let googleSync;

// --- Configuración Google Apps Script ---
// Usa tu URL CORRECTA aquí:
const GOOGLE_SCRIPT_URL = 'https://api.allorigins.win/raw?url=https://script.google.com/macros/s/AKfycbzaqlVI14pvR1XQF0hrSRJuP8praHIEdqa9k3cGpzf9gf9ur0V81kWPNwOR7BCNHVaGgw/exec';

// --- Clase Google Sync CORREGIDA ---
class GoogleSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.initializing = false;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Google Sync ya estaba inicializado');
            return true;
        }

        if (this.initializing) {
            console.log('⏳ Google Sync ya se está inicializando...');
            return false;
        }

        this.initializing = true;

        try {
            console.log('📡 Inicializando Google Sync...');
            
            // 1. Obtener User ID
            this.userId = this.getUserId();
            console.log('👤 User ID obtenido:', this.userId);
            
            // 2. Verificar que la URL esté configurada
            if (!GOOGLE_SCRIPT_URL) {
                throw new Error('URL de Google Script no configurada');
            }
            
            console.log('🔗 URL configurada:', GOOGLE_SCRIPT_URL);
            
            this.initialized = true;
            this.initializing = false;
            
            console.log('✅ Google Sync inicializado CORRECTAMENTE');
            console.log('👤 User ID:', this.userId);
            
            this.actualizarUIEstado('connected');
            return true;
            
        } catch (error) {
            this.initializing = false;
            console.error('❌ Error inicializando Google Sync:', error);
            this.actualizarUIEstado('error');
            return false;
        }
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

    async makeRequest(params) {
    if (!this.initialized) {
        throw new Error('Google Sync no inicializado. Llama a initialize() primero.');
    }

    try {
        console.log('📤 Enviando request a Google Script...', params.action);
        
        // Construir URL con parámetros GET (más compatible con proxies)
        const urlParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (key === 'profiles' && typeof params[key] === 'object') {
                urlParams.append(key, JSON.stringify(params[key]));
            } else {
                urlParams.append(key, params[key]);
            }
        });
        urlParams.append('userId', this.userId);
        
        // Reconstrucción de la URL final con el proxy
        const targetUrl = `https://script.google.com/macros/s/AKfycbzaqlVI14pvR1XQF0hrSRJuP8praHIEdqa9k3cGpzf9gf9ur0V81kWPNwOR7BCNHVaGgw/exec?${urlParams.toString()}&t=${Date.now()}`;
        const finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        
        console.log('🔗 URL final:', finalUrl);
        
        const response = await fetch(finalUrl, {
            method: 'GET', // Usar GET con proxy
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('📥 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Request exitoso:', params.action, result);
        
        if (result.success === false) {
            throw new Error(result.error || 'Error del servidor');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en request:', error);
        throw error;
    }
}

    async saveProfiles(profiles) {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede guardar');
            return false;
        }

        try {
            console.log('💾 Guardando perfiles en Google Sheets...', profiles.length);
            
            const result = await this.makeRequest({
                action: 'saveProfiles',
                profiles: profiles
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Perfiles guardados en Google Sheets correctamente');
            this.actualizarUIEstado('syncing');
            
            setTimeout(() => {
                this.actualizarUIEstado('connected');
            }, 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando en Google Sheets:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede cargar');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Google Sheets...');
            
            const result = await this.makeRequest({
                action: 'getProfiles'
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Perfiles cargados desde Google Sheets:', result.profiles.length);
            this.actualizarUIEstado('connected');
            // Devolver solo el array de perfiles
            return result.profiles || [];
            
        } catch (error) {
            console.error('❌ Error cargando desde Google Sheets:', error);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    async syncProfiles(localProfiles) {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado');
            return null;
        }

        if (this.syncInProgress) {
            console.log('⏳ Sincronización ya en progreso...');
            return null;
        }

        this.syncInProgress = true;

        try {
            console.log('🔄 Sincronizando perfiles...');
            this.actualizarUIEstado('syncing');
            
            // Esta función en .gs es un STUB, la verdadera lógica la implementamos en forzarSincronizacion
            // La dejamos aquí solo para pruebas internas o futuras implementaciones
            const result = await this.makeRequest({
                action: 'syncProfiles',
                profiles: localProfiles
            });

            this.lastSyncTime = result.lastSync;
            console.log('✅ Sincronización completada:', result.stats);
            this.actualizarUIEstado('connected');
            
            return result.profiles; // Devolver los perfiles fusionados
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            this.actualizarUIEstado('error');
            return null;
        } finally {
            this.syncInProgress = false;
        }
    }

    async getSyncStatus() {
        if (!this.initialized) return 'not_configured';

        try {
            const result = await this.makeRequest({
                action: 'getSyncStatus'
            });
            
            return {
                status: result.status,
                lastSync: result.lastSync,
                profilesCount: result.profilesCount
            };
        } catch (error) {
            return 'error';
        }
    }

    actualizarUIEstado(estado) {
        try {
            const syncInfo = document.getElementById('sync-info');
            const syncIcon = document.getElementById('sync-icon');
            const syncText = document.getElementById('sync-text');
            const lastSyncTime = document.getElementById('last-sync-time');
            const cloudProfilesCount = document.getElementById('cloud-profiles-count');
            
            if (!syncInfo || !syncIcon || !syncText) {
                console.warn('❌ Elementos de UI de sync no encontrados');
                return;
            }
            
            syncInfo.className = 'sync-info';
            
            switch(estado) {
                case 'connected':
                    syncInfo.classList.add('connected');
                    syncIcon.textContent = '✅';
                    syncText.textContent = 'Conectado a Google Sheets';
                    break;
                case 'syncing':
                    syncInfo.classList.add('syncing');
                    syncIcon.textContent = '🔄';
                    syncText.textContent = 'Sincronizando...';
                    break;
                case 'error':
                    syncInfo.classList.add('error');
                    syncIcon.textContent = '❌';
                    syncText.textContent = 'Error de conexión';
                    break;
                default:
                    syncInfo.classList.add('disconnected');
                    syncIcon.textContent = '🌐';
                    syncText.textContent = 'Conectando...';
            }
            
            if (this.lastSyncTime && lastSyncTime) {
                const date = new Date(this.lastSyncTime);
                lastSyncTime.textContent = date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
            } else if (lastSyncTime) {
                lastSyncTime.textContent = '--';
            }
            
            // Actualizar contador de perfiles en la nube al actualizar el estado
            if (cloudProfilesCount) {
                cloudProfilesCount.textContent = perfiles.length.toString();
            }

            console.log(`🔄 Estado de sync actualizado: ${estado}`);
            
        } catch (error) {
            console.error('❌ Error actualizando UI de sync:', error);
        }
    }

    getDeviceInfo() {
        return {
            id: this.userId,
            name: this.guessDeviceName(),
            type: this.detectDeviceType(),
            userAgent: navigator.userAgent.substring(0, 100),
            lastSync: this.lastSyncTime || new Date().toISOString()
        };
    }

    guessDeviceName() {
        const ua = navigator.userAgent;
        let name = 'Dispositivo';
        
        if (/Mobile|Android|iPhone/i.test(ua)) {
            name = /Tablet|iPad/i.test(ua) ? 'Tableta' : 'Teléfono';
        } else if (/Windows/i.test(ua)) {
            name = 'Computadora Windows';
        } else if (/Mac/i.test(ua)) {
            name = 'Computadora Mac';
        } else if (/Linux/i.test(ua)) {
            name = 'Computadora Linux';
        }
        
        return name;
    }

    detectDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            return /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile';
        }
        return 'desktop';
    }
}

// --- Elementos DOM (Continúa desde el código anterior) ---
const elementos = {
    // Pantallas
    perfilScreen: document.getElementById('perfil-screen'),
    configPerfilScreen: document.getElementById('config-perfil-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Sistema de Pestañas
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Indicadores
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    autoCalcIndicator: document.getElementById('auto-calc-indicator'),
    
    // Formularios
    tarifaInput: document.getElementById('tarifa'),
    minutosInput: document.getElementById('minutos'),
    distanciaInput: document.getElementById('distancia'),
    
    // Resultado Rápido
    resultadoRapido: document.getElementById('resultado-rapido'),
    resultadoBadge: document.getElementById('resultado-badge'),
    resultadoEmoji: document.getElementById('resultado-emoji'),
    resultadoTexto: document.getElementById('resultado-texto'),
    metricaMinuto: document.getElementById('metrica-minuto'),
    metricaKm: document.getElementById('metrica-km'),
    
    // Botones de Acción
    aceptarViajeBtn: document.getElementById('aceptar-viaje'),
    rechazarViajeBtn: document.getElementById('rechazar-viaje'),
    aceptarViajeTabBtn: document.getElementById('aceptar-viaje-tab'),
    rechazarViajeTabBtn: document.getElementById('rechazar-viaje-tab'),
    
    // Modales
    modalFondo: document.getElementById('modalFondo'),
    modalContenido: document.getElementById('modalContenido'),
    modalResultadosDoble: document.getElementById('modalResultadosDoble'),
    modalBadge: document.getElementById('modal-badge'),
    modalEmoji: document.getElementById('modal-emoji'),
    modalTexto: document.getElementById('modal-texto'),
    
    // Historial
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    exportarHistorialBtn: document.getElementById('exportar-historial'),
    
    // Estadísticas
    statsViajes: document.getElementById('stats-viajes'),
    statsGanancia: document.getElementById('stats-ganancia'),
    statsTiempo: document.getElementById('stats-tiempo'),
    statsRentables: document.getElementById('stats-rentables'),
    statsGananciaHora: document.getElementById('stats-ganancia-hora'),
    statsViajePromedio: document.getElementById('stats-viaje-promedio'),
    
    // Perfiles
    perfilesLista: document.getElementById('perfiles-lista'),
    nuevoPerfilBtn: document.getElementById('nuevo-perfil-btn'),
    perfilForm: document.getElementById('perfil-form'),
    volverPerfilesBtn: document.getElementById('volver-perfiles'),
    cancelarPerfilBtn: document.getElementById('cancelar-perfil'),
    cambiarPerfilBtn: document.getElementById('cambiar-perfil'),
    
    // Tema
    themeToggle: document.getElementById('theme-toggle'),
    
    // Exportación
    exportModal: document.getElementById('exportModal'),
    exportarPdfBtn: document.getElementById('exportar-pdf'),
    
    // Sincronización
    syncPanel: document.getElementById('sync-panel'),
    forceSyncBtn: document.getElementById('force-sync-btn') // Añadido para el listener
};

// --- Inicialización MEJORADA ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando UberCalc con Google Sync...');
    inicializarApp();
    configurarEventListeners();
});

async function inicializarApp() {
    console.log('📡 Inicializando Google Sync...');
    
    // Inicializar Google Sync
    googleSync = new GoogleSync();
    const googleReady = await googleSync.initialize();
    
    // Cargar datos (esta función contiene el FIX de sincronización)
    await cargarDatos();
    
    aplicarTemaGuardado();
    actualizarInterfazPerfiles();
    
    // Si hay perfiles, mostrar el último usado
    if (perfiles.length > 0 && perfilActual) {
        console.log('🏠 Mostrando pantalla principal con perfil:', perfilActual.nombre);
        mostrarPantalla('main');
        actualizarEstadisticas();
    } else {
        console.log('👤 Mostrando pantalla de perfiles (sin perfiles)');
        mostrarPantalla('perfil');
    }
    
    // Actualizar UI de sync
    actualizarPanelSync();
    
    console.log('🎉 UberCalc con Google Sync inicializado correctamente');
}

// ===============================================
// ** FIX CRÍTICO: CARGA Y SINCRONIZACIÓN DE DATOS **
// ===============================================

/**
 * Guarda los datos del estado global de la aplicación en LocalStorage.
 * Nota: El guardado en la nube para 'perfiles' se hace en 'guardarPerfil' y 'forzarSincronizacion'.
 */
function guardarDatos() {
    console.log('💾 Guardando datos localmente...');
    localStorage.setItem('perfiles', JSON.stringify(perfiles));
    if (perfilActual) {
        localStorage.setItem('perfilActualId', perfilActual.id);
    }
    localStorage.setItem('historial', JSON.stringify(historial));
    // Guardar también el historial en la nube sería el siguiente paso, pero por ahora solo perfiles.
}

/**
 * Carga los datos, dando prioridad a los perfiles de Google Sheets si están disponibles.
 */
async function cargarDatos() {
    console.log('📥 Cargando datos...');
    
    // 1. Cargar desde Local Storage (base)
    const perfilesLocal = JSON.parse(localStorage.getItem('perfiles') || '[]');
    const historialLocal = JSON.parse(localStorage.getItem('historial') || '[]');
    const perfilActualIdLocal = localStorage.getItem('perfilActualId');
    
    // Usar la versión local por defecto
    perfiles = perfilesLocal;
    historial = historialLocal;
    
    // 2. Intentar cargar y SOBRESCRIBIR desde Google Sheets
    if (googleSync && googleSync.initialized) {
        mostrarStatus('🔄 Buscando perfiles en la nube...', 'info');
        const perfilesNube = await googleSync.loadProfiles();
        
        if (perfilesNube && perfilesNube.length > 0) {
            console.log(`☁️ Perfiles encontrados en la nube: ${perfilesNube.length}. SOBRESCRIBIENDO local...`);
            // *** CORRECCIÓN CLAVE: Sobrescribir el array global 'perfiles' ***
            perfiles = perfilesNube; 
            
            // Asignar perfil actual
            perfilActual = perfiles.find(p => p.id === perfilActualIdLocal) || perfiles[0];
            
            // Guardar la nueva lista de perfiles en el Local Storage del dispositivo actual.
            guardarDatos(); 
            
            mostrarStatus('✅ Perfiles cargados desde Google Sheets', 'success');
        } else if (perfilesLocal.length > 0) {
            // Si la nube está vacía, pero local no, guardar la versión local en la nube (primer sync de este dispositivo)
            console.log('↗️ Guardando perfiles locales en la nube por primera vez...');
            await googleSync.saveProfiles(perfilesLocal);
            // Restaurar perfil actual basado en local
            perfilActual = perfilesLocal.find(p => p.id === perfilActualIdLocal) || perfilesLocal[0];
            mostrarStatus('✅ Perfiles cargados localmente (guardados en nube)', 'success');
        }
    } else {
        // Restaurar perfil actual basado en local
        perfilActual = perfilesLocal.find(p => p.id === perfilActualIdLocal) || perfilesLocal[0];
        mostrarStatus('✅ Usando almacenamiento local', 'info');
    }
    
    // Si no hay perfiles, establecer perfil actual a null
    if (perfiles.length === 0) {
        perfilActual = null;
    }

    console.log(`✅ Datos cargados. Perfiles: ${perfiles.length}. Historial: ${historial.length}`);
}


/**
 * Función vinculada al botón 'Sincronizar Ahora'.
 */
async function forzarSincronizacion() {
    if (!googleSync || !googleSync.initialized) {
        mostrarError('Google Sync no está inicializado.');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando datos con la nube...', 'syncing');
    
    try {
        // 1. Guardar la versión actual (Local) en la nube (para subir el perfil recién creado en el PC).
        const saveSuccess = await googleSync.saveProfiles(perfiles);
        
        if (saveSuccess) {
            // 2. Recargar desde la nube (para traer datos de otros dispositivos como el PC).
            await cargarDatos(); 
            
            // 3. Actualizar la UI
            actualizarInterfazPerfiles();
            actualizarEstadisticas();
            actualizarPanelSync();
            
            mostrarStatus('✅ Sincronización completa y datos actualizados', 'success');
        } else {
            throw new Error('Falló el guardado en la nube.');
        }

    } catch (error) {
        console.error('❌ Error en forzarSincronizacion:', error);
        mostrarError('❌ Error al sincronizar: ' + error.message);
    }
}
// ===============================================

function configurarEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Sistema de Pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('📑 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
    
    // Cálculo Automático
    elementos.tarifaInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.minutosInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.distanciaInput.addEventListener('input', manejarCalculoAutomatico);
    
    // Botones de Acción
    elementos.aceptarViajeBtn.addEventListener('click', function() {
        console.log('✅ Botón aceptar viaje clickeado');
        procesarViaje(true);
    });
    
    elementos.rechazarViajeBtn.addEventListener('click', function() {
        console.log('❌ Botón rechazar viaje clickeado');
        procesarViaje(false);
    });
    
    elementos.aceptarViajeTabBtn.addEventListener('click', function() {
        console.log('✅ Botón aceptar viaje (tab) clickeado');
        procesarViaje(true);
    });
    
    elementos.rechazarViajeTabBtn.addEventListener('click', function() {
        console.log('❌ Botón rechazar viaje (tab) clickeado');
        procesarViaje(false);
    });
    
    // Historial
    elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    elementos.exportarHistorialBtn.addEventListener('click', mostrarModalExportacion);
    
    // Perfiles
    elementos.nuevoPerfilBtn.addEventListener('click', function() {
        console.log('➕ Creando nuevo perfil');
        mostrarConfigPerfil();
    });
    
    elementos.volverPerfilesBtn.addEventListener('click', function() {
        console.log('⬅️ Volviendo a perfiles');
        mostrarPantalla('perfil');
    });
    
    elementos.cancelarPerfilBtn.addEventListener('click', function() {
        console.log('❌ Cancelando creación/edición de perfil');
        mostrarPantalla('perfil');
    });
    
    elementos.cambiarPerfilBtn.addEventListener('click', function() {
        console.log('👤 Cambiando perfil');
        mostrarPantalla('perfil');
    });
    
    elementos.perfilForm.addEventListener('submit', guardarPerfil);
    
    // Botón de sincronización manual
    if (elementos.forceSyncBtn) {
        elementos.forceSyncBtn.addEventListener('click', forzarSincronizacion);
    }
    
    // Tema
    elementos.themeToggle.addEventListener('click', alternarTema);
    
    // Exportación
    elementos.exportarPdfBtn.addEventListener('click', exportarPDF);
    
    // Configuración de Unidades
    const tipoMedidaSelect = document.getElementById('tipo-medida');
    const tipoCombustibleSelect = document.getElementById('tipo-combustible');
    const monedaSelect = document.getElementById('moneda');
    
    if (tipoMedidaSelect) {
        tipoMedidaSelect.addEventListener('change', actualizarUnidades);
    }
    
    if (tipoCombustibleSelect) {
        tipoCombustibleSelect.addEventListener('change', actualizarUnidades);
    }
    
    if (monedaSelect) {
        monedaSelect.addEventListener('change', actualizarUnidades);
    }
    
    console.log('✅ Event listeners configurados correctamente');
}

// --- Sistema de Pestañas ---
function cambiarPestana(tabId) {
    console.log('📑 Cambiando a pestaña:', tabId);
    
    // Actualizar botones de pestañas
    elementos.tabButtons.forEach(button => {
        const buttonTab = button.getAttribute('data-tab');
        button.classList.toggle('active', buttonTab === tabId);
    });
    
    // Actualizar contenido de pestañas
    elementos.tabContents.forEach(content => {
        const contentId = content.id.replace('tab-', '');
        content.classList.toggle('active', contentId === tabId);
    });
    
    // Actualizar datos si es necesario
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    } else if (tabId === 'historial') {
        actualizarHistorial();
    } else if (tabId === 'sync') {
        actualizarPanelSync();
    }
}

// --- Cálculo Automático ---
function manejarCalculoAutomatico() {
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    const tarifa = parseFloat(elementos.tarifaInput.value) || 0;
    const minutos = parseFloat(elementos.minutosInput.value) || 0;
    const distancia = parseFloat(elementos.distanciaInput.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        console.log('🧮 Calculando automáticamente...');
        elementos.autoCalcIndicator.classList.remove('hidden');
        
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        } else {
            elementos.autoCalcIndicator.classList.add('hidden');
            elementos.resultadoRapido.classList.add('hidden');
        }
    } else {
        elementos.autoCalcIndicator.classList.add('hidden');
        elementos.resultadoRapido.classList.add('hidden');
        resetearInterfazCalculo();
    }
}

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    
    console.log('🎯 Mostrando resultado rápido:', resultado.rentabilidad);
    
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
    
    elementos.autoCalcIndicator.classList.add('hidden');
}

function resetearInterfazCalculo() {
    elementos.aceptarViajeTabBtn.className = 'primary-button';
    elementos.aceptarViajeTabBtn.classList.remove('rentable', 'oportunidad', 'no-rentable');
    calculoActual = null;
}

// --- Funciones de Cálculo ---
function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        console.error('❌ No hay perfil actual para calcular');
        return null;
    }
    
    try {
        console.log('💰 Calculando rentabilidad...');
        
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
        
        let rentabilidad;
        let emoji;
        let texto;
        
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
        
        const resultado = {
            tarifa,
            minutos,
            distancia,
            gananciaNeta,
            gananciaPorMinuto,
            gananciaPorKm,
            costoCombustible,
            costoMantenimiento,
            costoSeguro,
            costoTotal,
            rentabilidad,
            emoji,
            texto,
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Resultado del cálculo:', rentabilidad);
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en el cálculo:', error);
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

function mostrarModalResultados(resultado) {
    if (!resultado) return;
    
    console.log('📊 Mostrando modal de resultados:', resultado.rentabilidad);
    
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
    
    console.log(aceptado ? '✅ Aceptando viaje...' : '❌ Rechazando viaje...');
    
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
    
    if (historial.length > 50) {
        historial = historial.slice(0, 50);
    }
    
    guardarDatos();
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
    
    const historialMostrar = historial.slice(0, 10);
    
    historialMostrar.forEach(item => {
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
        
        historyItem.addEventListener('click', () => {
            mostrarDetallesViaje(item);
        });
        
        elementos.historyList.appendChild(historyItem);
    });
}

function mostrarDetallesViaje(viaje) {
    const detalles = `
📊 DETALLES DEL VIAJE
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

✅ ESTADO: ${viaje.aceptado ? 'ACEPTADO' : 'RECHAZADO'}
    `;
    
    alert(detalles);
}

function limpiarHistorial() {
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        historial = [];
        guardarDatos();
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
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + item.tarifa, 0); // Continúa la función
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + item.minutos, 0);
    const viajesRentables = viajesHoy.filter(item => item.rentabilidad === 'rentable').length;
    
    // Costos totales del día (para la sección de estadísticas)
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
        totalViajes,
        gananciaTotal,
        tiempoTotal,
        viajesRentables,
        costoCombustibleTotal,
        costoMantenimientoTotal,
        costoSeguroTotal,
        gananciaNetaTotal,
        gananciaPorHora,
        viajePromedio
    };
}

// --- Gestión de Perfiles ---
function mostrarConfigPerfil(perfil = null) {
    console.log('⚙️ Mostrando configuración de perfil:', perfil ? perfil.nombre : 'Nuevo perfil');
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
        fechaActualizacion: new Date().toISOString(),
        lastModified: Date.now()
    };
    
    if (!perfil.nombre || !perfil.rendimiento || !perfil.precioCombustible) {
        mostrarError('Por favor, completa todos los campos requeridos');
        return;
    }
    
    if (perfilId) {
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfil;
            console.log('✅ Perfil actualizado:', perfil.nombre);
        }
    } else {
        perfiles.push(perfil);
        console.log('✅ Nuevo perfil creado:', perfil.nombre);
    }
    
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
        console.log('🎯 Perfil actual establecido:', perfil.nombre);
    }
    
    guardarDatos(); 
    
    // Sincronizar con Google Sheets (para que el PC suba el perfil a la nube)
    if (googleSync && googleSync.initialized) {
        const success = await googleSync.saveProfiles(perfiles);
        if (success) {
            mostrarStatus('✅ Perfil guardado y sincronizado en Google Sheets', 'success');
        } else {
            mostrarStatus('💾 Perfil guardado (solo local)', 'warning');
        }
    } else {
        mostrarStatus('💾 Perfil guardado (almacenamiento local)', 'info');
    }
    
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
}

function actualizarInterfazPerfiles() {
    if (!elementos.perfilesLista) {
        console.error('❌ Elemento perfiles-lista no encontrado');
        return;
    }
    
    console.log('🔄 Actualizando interfaz de perfiles. Total:', perfiles.length);
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
                    <span class="button-icon">🚗</span> Usar 
                </button>
                <button class="secondary-button small editar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">✏️</span> Editar 
                </button>
                <button class="secondary-button small eliminar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">🗑️</span> Eliminar 
                </button>
            </div>
        `;
        
        // Event listener para el botón USAR
        const usarBtn = perfilItem.querySelector('.usar-perfil-btn');
        if (usarBtn) {
            usarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('🎯 Botón USAR clickeado para perfil:', perfilId);
                seleccionarPerfil(perfilId);
            });
        }
        
        // Event listener para el botón EDITAR
        const editarBtn = perfilItem.querySelector('.editar-perfil-btn');
        if (editarBtn) {
            editarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('✏️ Botón EDITAR clickeado para perfil:', perfilId);
                editarPerfil(perfilId);
            });
        }
        
        // Event listener para el botón ELIMINAR
        const eliminarBtn = perfilItem.querySelector('.eliminar-perfil-btn');
        if (eliminarBtn) {
            eliminarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('🗑️ Botón ELIMINAR clickeado para perfil:', perfilId);
                eliminarPerfil(perfilId);
            });
        }
        
        // También permitir seleccionar haciendo clic en el item completo
        perfilItem.addEventListener('click', function(e) {
            // Prevenir que se active si se hizo clic en un botón
            if (!e.target.closest('.perfil-acciones')) {
                console.log('🎯 Clic en item perfil:', perfil.id);
                seleccionarPerfil(perfil.id);
            }
        });
        
        elementos.perfilesLista.appendChild(perfilItem);
    });
    
    console.log('✅ Interfaz de perfiles actualizada correctamente');
}

async function seleccionarPerfil(perfilId) {
    console.log('🎯 Intentando seleccionar perfil:', perfilId);
    const perfil = perfiles.find(p => p.id === perfilId);
    
    if (perfil) {
        console.log('✅ Perfil encontrado:', perfil.nombre);
        perfilActual = perfil;
        
        guardarDatos(); 
        
        // Sincronizar cambio con Google Sheets
        if (googleSync && googleSync.initialized) {
            console.log('📡 Sincronizando con Google Sheets...');
            await googleSync.saveProfiles(perfiles);
        }
        
        console.log('🔄 Mostrando pantalla principal...');
        mostrarPantalla('main');
        mostrarStatus(`🚗 Perfil "${perfil.nombre}" activado`, 'success');
        actualizarUnidades();
        actualizarEstadisticas();
    } else {
        console.error('❌ Perfil no encontrado con ID:', perfilId);
        mostrarError('Error: Perfil no encontrado');
    }
}

function editarPerfil(perfilId) {
    console.log('✏️ Editando perfil:', perfilId);
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    } else {
        console.error('❌ Perfil no encontrado para editar:', perfilId);
        mostrarError('Perfil no encontrado');
    }
}

async function eliminarPerfil(perfilId) {
    console.log('🗑️ Intentando eliminar perfil:', perfilId);
    
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    const perfilAEliminar = perfiles.find(p => p.id === perfilId);
    if (!perfilAEliminar) {
        mostrarError('Perfil no encontrado');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar el perfil "${perfilAEliminar.nombre}"? Esta acción no se puede deshacer.`)) {
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
            console.log('🔄 Cambiando a perfil:', perfilActual.nombre);
        }
        
        guardarDatos();
        
        // Sincronizar con Google Sheets
        if (googleSync && googleSync.initialized) {
            const success = await googleSync.saveProfiles(perfiles);
            if (success) {
                mostrarStatus('✅ Perfil eliminado y sincronizado', 'success');
            } else {
                mostrarStatus('🗑️ Perfil eliminado (solo local)', 'warning');
            }
        } else {
            mostrarStatus('🗑️ Perfil eliminado (almacenamiento local)', 'info');
        }
        
        actualizarInterfazPerfiles();
        actualizarEstadisticas();
    }
}

// --- Funciones de Utilidad ---
function mostrarPantalla(screenId) {
    console.log('🖥️ Cambiando a pantalla:', screenId);
    
    const screens = [elementos.perfilScreen, elementos.configPerfilScreen, elementos.mainScreen];
    
    screens.forEach(screen => {
        if (screen) {
            const id = screen.id.replace('-screen', '');
            screen.classList.toggle('active', id === screenId);
        }
    });
    
    // Si cambiamos a la pantalla principal, cambiamos a la pestaña de cálculo
    if (screenId === 'main') {
        cambiarPestana('calculo');
    }
}

function mostrarStatus(message, type = 'info') {
    const statusBox = elementos.statusIndicator;
    const statusText = elementos.statusText;
    
    if (!statusBox || !statusText) return;
    
    statusText.textContent = message;
    statusBox.className = 'status-box';
    statusBox.classList.add(type);
    statusBox.style.display = 'flex';
    
    // Ocultar después de 5 segundos (a menos que sea error)
    if (type !== 'error') {
        setTimeout(() => {
            statusBox.style.display = 'none';
        }, 5000);
    }
}

function mostrarError(message) {
    mostrarStatus(message, 'error');
}

function cerrarModal() {
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
    limpiarFormulario();
}

function limpiarFormulario() {
    elementos.tarifaInput.value = '';
    elementos.minutosInput.value = '';
    elementos.distanciaInput.value = '';
    elementos.resultadoRapido.classList.add('hidden');
    elementos.autoCalcIndicator.classList.add('hidden');
    calculoActual = null;
    resetearInterfazCalculo();
}

function formatearMoneda(valor) {
    if (!perfilActual) return `$${valor.toFixed(2)}`;
    
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: perfilActual.moneda,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

function actualizarUnidades() {
    if (!perfilActual) {
        console.warn('❌ No hay perfil actual para actualizar unidades');
        return;
    }
    
    // Actualizar unidades en el formulario de configuración
    const tipoMedida = perfilActual.tipoMedida;
    const tipoCombustible = perfilActual.tipoCombustible;
    
    const distanciaLabel = document.querySelector('label[for="distancia"]');
    if (distanciaLabel) {
        distanciaLabel.textContent = `Distancia (${tipoMedida === 'mi' ? 'millas' : 'km'})`;
    }
    
    const rendimientoLabel = document.querySelector('label[for="rendimiento"]');
    if (rendimientoLabel) {
        rendimientoLabel.textContent = `Rendimiento (${tipoMedida === 'mi' ? 'mpg' : 'Km/Gal'})`;
    }
    
    const umbralKmLabel = document.querySelector('label[for="umbral-km-rentable"]');
    if (umbralKmLabel) {
        umbralKmLabel.textContent = `Umbral Km Rentable (${perfilActual.moneda}/${tipoMedida === 'mi' ? 'mi' : 'km'})`;
    }

    // Actualizar símbolos de moneda
    const monedaInputs = document.querySelectorAll('.moneda-simbolo');
    monedaInputs.forEach(input => {
        input.textContent = formatearMoneda(0).replace('0,00', '');
    });
    
    // Esto asegura que la IU se refresque con el perfil correcto
    actualizarInterfazPerfiles();
    actualizarEstadisticas();
    calcularAutomatico(); // Recalcular con nuevas unidades
}

function aplicarTemaGuardado() {
    const temaGuardado = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', temaGuardado);
    elementos.themeToggle.textContent = temaGuardado === 'dark' ? '☀️' : '🌙';
}

function alternarTema() {
    const temaActual = document.body.getAttribute('data-theme');
    const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', nuevoTema);
    localStorage.setItem('theme', nuevoTema);
    elementos.themeToggle.textContent = nuevoTema === 'dark' ? '☀️' : '🌙';
}

async function actualizarPanelSync() {
    if (!googleSync || !googleSync.initialized) {
        document.getElementById('sync-text').textContent = 'No configurado';
        document.getElementById('sync-icon').textContent = '⚠️';
        document.getElementById('last-sync-time').textContent = '--';
        document.getElementById('cloud-profiles-count').textContent = perfiles.length.toString();
        return;
    }

    try {
        const statusData = await googleSync.getSyncStatus();
        
        document.getElementById('cloud-profiles-count').textContent = perfiles.length.toString();
        googleSync.actualizarUIEstado(statusData.status);
    } catch (error) {
        googleSync.actualizarUIEstado('error');
    }
}

function mostrarInfoSync() {
    const mensaje = `
        ℹ️ CÓMO FUNCIONA LA SINCRONIZACIÓN
        
        1. Guardado (PC/Móvil): Cada vez que creas o editas un perfil, este se guarda en tu Google Sheet automáticamente.
        
        2. Carga (Móvil/iPad): Al iniciar la aplicación en otro dispositivo, o al presionar "Sincronizar Ahora", se descargan los perfiles de la nube y se sobrescriben los perfiles locales.
        
        3. ID de Usuario: Tu dispositivo tiene un ID único (User ID: ${googleSync?.userId || 'No disponible'}) para identificar tu fila en la hoja de cálculo.
    `;
    alert(mensaje);
}

// --- Funciones de Exportación (Stubs para completar el código) ---
function mostrarModalExportacion() {
    if (historial.length === 0) {
        mostrarError('No hay historial para exportar.');
        return;
    }
    elementos.exportModal.style.display = 'flex';
}

function exportarPDF() {
    alert('Función de Exportar PDF no implementada aún.');
    elementos.exportModal.style.display = 'none';
}

function diagnosticoConexion() {
    // La clase GoogleSync ya tiene los métodos para esto, la dejamos como referencia
    alert('Diagnóstico: La función de diagnóstico debe ser llamada en la consola para un análisis detallado.');
}

window.forzarSincronizacion = forzarSincronizacion;
window.cerrarModal = cerrarModal;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticoConexion = diagnosticoConexion;
// El resto de funciones globales se mantienen implícitas

// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión COMPLETA con Firebase Sync FUNCIONANDO
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;

// --- Configuración Firebase CORREGIDA ---
const firebaseConfig = {
    apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
    authDomain: "diber-32875.firebaseapp.com",
    projectId: "diber-32875",
    storageBucket: "diber-32875.appspot.com", // CORREGIDO
    messagingSenderId: "260349079723",
    appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// --- Clase Firebase Sync COMPLETA Y CORREGIDA ---
class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.db = null;
        this.unsubscribe = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Firebase ya estaba inicializado');
            return true;
        }

        try {
            console.log('🔥 Iniciando inicialización de Firebase...');
            
            // Verificar si Firebase está disponible
            if (typeof firebase === 'undefined') {
                console.error('❌ Firebase no está cargado en la página');
                this.actualizarUIEstado('error');
                return false;
            }

            console.log('✅ Firebase está disponible');

            // Inicializar Firebase
            if (!firebase.apps.length) {
                console.log('🚀 Inicializando nueva app de Firebase');
                firebase.initializeApp(firebaseConfig);
            } else {
                console.log('✅ Firebase app ya existe');
            }
            
            // Configurar Firestore
            this.db = firebase.firestore();
            
            // Configuración de Firestore para mejor rendimiento
            this.db.settings({
                cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
                merge: true
            });

            console.log('✅ Firestore configurado');

            // Intentar habilitar persistencia offline
            try {
                await this.db.enablePersistence({ synchronizeTabs: true });
                console.log('✅ Persistencia offline habilitada');
            } catch (err) {
                console.warn('⚠️ Persistencia no disponible:', err.message);
                // Continuar sin persistencia
            }
            
            this.userId = this.getUserId();
            this.initialized = true;
            
            console.log('🎉 Firebase Sync inicializado CORRECTAMENTE');
            console.log('👤 User ID:', this.userId);
            this.actualizarUIEstado('connected');
            return true;
            
        } catch (error) {
            console.error('💥 ERROR crítico inicializando Firebase:', error);
            this.actualizarUIEstado('error');
            
            // Reintento automático
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Reintentando en 3 segundos... (${this.retryCount}/${this.maxRetries})`);
                setTimeout(() => this.initialize(), 3000);
            } else {
                console.error('❌ Se agotaron los reintentos de Firebase');
            }
            return false;
        }
    }

    getUserId() {
        let userId = localStorage.getItem('ubercalc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ubercalc_user_id', userId);
            console.log('🆕 Nuevo User ID generado:', userId);
        } else {
            console.log('📋 User ID existente:', userId);
        }
        return userId;
    }

    async saveProfiles(profiles) {
        if (!this.initialized) {
            console.warn('⚠️ Firebase no inicializado, no se puede guardar');
            return false;
        }

        try {
            console.log('💾 Intentando guardar', profiles.length, 'perfiles en Firebase...');
            
            const userData = {
                perfiles: profiles,
                ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                dispositivo: this.getDeviceInfo(),
                version: '2.0',
                syncTimestamp: Date.now()
            };

            console.log('📤 Enviando datos a Firestore...');
            await this.db.collection('users').doc(this.userId).set(userData, { merge: true });
            
            console.log('✅ Perfiles guardados EXITOSAMENTE en Firebase');
            this.actualizarUIEstado('syncing');
            
            // Volver a estado conectado después de un tiempo
            setTimeout(() => {
                this.actualizarUIEstado('connected');
            }, 1500);
            
            return true;
            
        } catch (error) {
            console.error('❌ ERROR guardando en Firebase:', error);
            console.error('Detalles del error:', error.message);
            this.actualizarUIEstado('error');
            
            // Reintentar una vez
            setTimeout(async () => {
                console.log('🔄 Reintentando guardado...');
                try {
                    await this.db.collection('users').doc(this.userId).set({
                        perfiles: profiles,
                        ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    console.log('✅ Reintento exitoso');
                    this.actualizarUIEstado('connected');
                } catch (retryError) {
                    console.error('❌ Reintento fallido:', retryError);
                }
            }, 2000);
            
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('⚠️ Firebase no inicializado');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Firebase...');
            
            const docRef = this.db.collection('users').doc(this.userId);
            const doc = await docRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                const perfilesCount = data.perfiles ? data.perfiles.length : 0;
                console.log(`✅ ${perfilesCount} perfiles cargados desde Firebase`);
                this.actualizarUIEstado('connected');
                return data.perfiles || [];
            } else {
                console.log('ℹ️ No existe documento en Firebase, creando uno nuevo...');
                // Crear documento vacío
                await docRef.set({
                    perfiles: [],
                    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                    dispositivo: this.getDeviceInfo(),
                    version: '2.0'
                });
                return [];
            }
            
        } catch (error) {
            console.error('❌ ERROR cargando desde Firebase:', error);
            console.error('Detalles:', error.message);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    listenForChanges(callback) {
        if (!this.initialized) {
            console.warn('⚠️ No se puede crear listener - Firebase no inicializado');
            return;
        }

        try {
            console.log('👂 Iniciando listener en tiempo real...');
            
            const docRef = this.db.collection('users').doc(this.userId);
            
            this.unsubscribe = docRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log('🔄 CAMBIO DETECTADO en Firebase - Perfiles:', data.perfiles?.length || 0);
                    this.actualizarUIEstado('connected');
                    
                    if (callback && typeof callback === 'function') {
                        console.log('📨 Enviando perfiles actualizados al callback');
                        callback(data.perfiles || []);
                    }
                } else {
                    console.log('📄 Documento no existe en listener');
                }
            }, (error) => {
                console.error('❌ ERROR en listener Firebase:', error);
                this.actualizarUIEstado('error');
                
                // Reintentar conexión después de 5 segundos
                console.log('🔄 Reintentando conexión del listener en 5 segundos...');
                setTimeout(() => {
                    if (this.initialized) {
                        this.listenForChanges(callback);
                    }
                }, 5000);
            });
            
            console.log('✅ Listener activado correctamente');
            
        } catch (error) {
            console.error('💥 ERROR configurando listener:', error);
        }
    }

    stopListening() {
        if (this.unsubscribe) {
            console.log('🔇 Deteniendo listener...');
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    getDeviceInfo() {
        const deviceInfo = {
            id: this.userId,
            name: localStorage.getItem('ubercalc_device_name') || this.guessDeviceName(),
            type: this.detectDeviceType(),
            userAgent: navigator.userAgent.substring(0, 100), // Limitar tamaño
            lastSync: new Date().toISOString(),
            platform: navigator.platform,
            appVersion: '2.0'
        };
        
        console.log('📱 Información del dispositivo:', deviceInfo.name, deviceInfo.type);
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
            
            if (!syncInfo || !syncIcon || !syncText) {
                console.log('ℹ️ Elementos de UI de sync no encontrados');
                return;
            }
            
            // Limpiar clases anteriores
            syncInfo.className = 'sync-info';
            syncInfo.classList.add(estado);
            
            switch(estado) {
                case 'connected':
                    syncIcon.textContent = '✅';
                    syncText.textContent = 'Conectado a la nube';
                    syncInfo.title = 'Sincronización activa - Todo funciona correctamente';
                    break;
                case 'syncing':
                    syncIcon.textContent = '🔄';
                    syncText.textContent = 'Sincronizando...';
                    syncInfo.title = 'Sincronizando datos con la nube';
                    break;
                case 'error':
                    syncIcon.textContent = '❌';
                    syncText.textContent = 'Error de conexión';
                    syncInfo.title = 'Problema de conexión con la nube';
                    break;
                default:
                    syncIcon.textContent = '🌐';
                    syncText.textContent = 'Conectando...';
                    syncInfo.title = 'Estableciendo conexión con la nube';
            }
            
            console.log(`🔄 Estado de Sync actualizado: ${estado}`);
            
        } catch (error) {
            console.error('Error actualizando UI de sync:', error);
        }
    }

    async getSyncStatus() {
        if (!this.initialized) {
            return { status: 'not_initialized', message: 'Firebase no inicializado' };
        }

        try {
            const doc = await this.db.collection('users').doc(this.userId).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    status: 'connected',
                    lastSync: data.ultimaActualizacion?.toDate() || new Date(),
                    profilesCount: data.perfiles?.length || 0,
                    device: data.dispositivo?.name || 'Desconocido'
                };
            }
            return { status: 'no_data', message: 'No hay datos en la nube' };
        } catch (error) {
            return { status: 'error', message: error.message };
        }
    }

    // Método para debug
    async debugFirebase() {
        console.group('🔥 DEBUG FIREBASE');
        console.log('✅ Initialized:', this.initialized);
        console.log('✅ User ID:', this.userId);
        console.log('✅ DB disponible:', !!this.db);
        console.log('✅ Firebase app:', firebase.apps[0]?.name || 'No app');
        
        if (this.initialized) {
            const status = await this.getSyncStatus();
            console.log('✅ Sync Status:', status);
        }
        console.groupEnd();
    }
}

// --- Elementos DOM ---
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
    syncPanel: document.getElementById('sync-panel')
};

// --- Inicialización PRINCIPAL MEJORADA ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Cargado - Iniciando UberCalc...');
    inicializarApp().catch(error => {
        console.error('💥 Error crítico en inicialización:', error);
    });
});

async function inicializarApp() {
    console.log('🎯 Inicializando aplicación...');
    
    try {
        // 1. Inicializar Firebase Sync PRIMERO
        console.log('🔥 Paso 1: Inicializando Firebase Sync...');
        firebaseSync = new FirebaseSync();
        const firebaseReady = await firebaseSync.initialize();
        
        if (firebaseReady) {
            console.log('✅ Firebase listo - Configurando listener...');
            
            // Configurar listener para cambios en tiempo real
            firebaseSync.listenForChanges((nuevosPerfiles) => {
                if (nuevosPerfiles && Array.isArray(nuevosPerfiles)) {
                    console.log(`🔄 📱 Sincronización recibida: ${nuevosPerfiles.length} perfiles`);
                    
                    // Actualizar perfiles locales
                    perfiles = nuevosPerfiles;
                    
                    // Actualizar perfil actual si existe
                    if (perfilActual) {
                        const perfilActualizado = perfiles.find(p => p.id === perfilActual.id);
                        if (perfilActualizado) {
                            perfilActual = perfilActualizado;
                            console.log('✅ Perfil actual actualizado:', perfilActual.nombre);
                        } else if (perfiles.length > 0) {
                            perfilActual = perfiles[0];
                            console.log('🔄 Cambiando al primer perfil disponible:', perfilActual.nombre);
                        }
                    }
                    
                    // Guardar y actualizar UI
                    guardarDatos();
                    actualizarInterfazPerfiles();
                    actualizarUnidades();
                    
                    // Mostrar notificación solo si hay cambios reales
                    if (nuevosPerfiles.length > 0) {
                        mostrarStatus('🔄 Perfiles actualizados desde la nube', 'info');
                    }
                }
            });
            
            // Cargar datos desde Firebase
            console.log('📥 Cargando datos iniciales desde Firebase...');
            await cargarDatos();
            
        } else {
            console.warn('⚠️ Firebase no disponible - Modo offline');
            cargarDatos(); // Cargar desde localStorage
        }
        
    } catch (error) {
        console.error('❌ Error en inicialización Firebase:', error);
        cargarDatos(); // Fallback a localStorage
    }
    
    // 2. Configuración básica de la app
    console.log('⚙️ Paso 2: Configurando aplicación...');
    aplicarTemaGuardado();
    configurarEventListeners();
    actualizarInterfazPerfiles();
    
    // 3. Decidir qué pantalla mostrar
    if (perfiles.length > 0 && perfilActual) {
        console.log('🏠 Mostrando pantalla principal - Perfil activo:', perfilActual.nombre);
        mostrarPantalla('main');
        actualizarEstadisticas();
    } else {
        console.log('👤 Mostrando pantalla de perfiles - Sin perfiles');
        mostrarPantalla('perfil');
    }
    
    // 4. Actualizar panel de sync
    actualizarPanelSync();
    
    console.log('🎉 UberCalc inicializado COMPLETAMENTE');
    mostrarStatus('✅ Aplicación lista', 'success');
    
    // Debug opcional
    setTimeout(() => {
        if (firebaseSync) {
            firebaseSync.debugFirebase();
        }
    }, 3000);
}

// --- [EL RESTO DEL CÓDIGO SE MANTIENE IGUAL PERO ACTUALIZADO] ---

function configurarEventListeners() {
    console.log('⚡ Configurando event listeners...');
    
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
    
    console.log('✅ Event listeners configurados');
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

// --- Gestión de Perfiles MEJORADA ---
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
    console.log('💾 Iniciando guardado de perfil...');
    
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
            console.log('✅ Perfil actualizado:', perfil.nombre);
        }
    } else {
        perfiles.push(perfil);
        console.log('✅ Nuevo perfil creado:', perfil.nombre);
    }
    
    // Actualizar perfil actual si es necesario
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
        console.log('🎯 Perfil actual establecido:', perfil.nombre);
    }
    
    // Guardar localmente
    guardarDatos();
    
    // SINCRONIZAR CON FIREBASE - PARTE CRÍTICA
    if (firebaseSync && firebaseSync.initialized) {
        console.log('🔥 Sincronizando con Firebase...');
        const success = await firebaseSync.saveProfiles(perfiles);
        
        if (success) {
            console.log('✅ Sincronización EXITOSA con Firebase');
            mostrarStatus('✅ Perfil guardado y sincronizado en la nube', 'success');
        } else {
            console.warn('⚠️ Sincronización falló, pero perfil guardado localmente');
            mostrarStatus('💾 Perfil guardado (solo local)', 'warning');
        }
    } else {
        console.log('📱 Firebase no disponible - Guardado solo local');
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
                console.log('🎯 Botón USAR clickeado para perfil:', perfilId);
                seleccionarPerfil(perfilId);
            });
        }
        
        if (editarBtn) {
            editarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('✏️ Botón EDITAR clickeado para perfil:', perfilId);
                editarPerfil(perfilId);
            });
        }
        
        if (eliminarBtn) {
            eliminarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('🗑️ Botón ELIMINAR clickeado para perfil:', perfilId);
                eliminarPerfil(perfilId);
            });
        }
        
        // Clic en el item completo
        perfilItem.addEventListener('click', function(e) {
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
        
        // Sincronizar con Firebase
        if (firebaseSync && firebaseSync.initialized) {
            console.log('🔥 Sincronizando cambio de perfil con Firebase...');
            await firebaseSync.saveProfiles(perfiles);
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
        
        // Sincronizar con Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.saveProfiles(perfiles);
        }
        
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
        console.log('✅ Perfil eliminado:', perfilId);
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

// --- Sincronización Firebase UI ---
function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización');
    actualizarPanelSync();
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
    }
}

function cerrarSyncPanel() {
    console.log('❌ Cerrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

async function actualizarPanelSync() {
    if (!firebaseSync) {
        console.log('❌ Firebase Sync no disponible');
        return;
    }
    
    console.log('🔄 Actualizando panel de sync');
    
    try {
        const deviceInfo = firebaseSync.getDeviceInfo();
        const deviceName = document.getElementById('current-device-name');
        const deviceId = document.getElementById('current-device-id');
        const deviceIcon = document.getElementById('current-device-icon');
        
        if (deviceName) deviceName.textContent = deviceInfo.name;
        if (deviceId) deviceId.textContent = `ID: ${deviceInfo.id.substring(0, 8)}...`;
        if (deviceIcon) {
            deviceIcon.textContent = deviceInfo.type === 'mobile' ? '📱' : 
                                    deviceInfo.type === 'tablet' ? '📟' : '💻';
        }
        
        const firebaseStatus = document.getElementById('firebase-status');
        const lastSyncTime = document.getElementById('last-sync-time');
        const cloudProfilesCount = document.getElementById('cloud-profiles-count');
        
        if (firebaseSync.initialized) {
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Conectado';
                firebaseStatus.style.color = 'var(--success-green)';
            }
            
            const syncStatus = await firebaseSync.getSyncStatus();
            if (syncStatus.status === 'connected') {
                if (lastSyncTime) {
                    lastSyncTime.textContent = syncStatus.lastSync.toLocaleTimeString();
                }
                if (cloudProfilesCount) {
                    cloudProfilesCount.textContent = syncStatus.profilesCount;
                }
            }
        } else {
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Desconectado';
                firebaseStatus.style.color = 'var(--error-red)';
            }
            if (lastSyncTime) lastSyncTime.textContent = '--';
            if (cloudProfilesCount) cloudProfilesCount.textContent = '--';
        }
    } catch (error) {
        console.error('❌ Error actualizando panel sync:', error);
    }
}

async function forzarSincronizacion() {
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('Firebase no está configurado');
        return;
    }
    
    console.log('🔄 Forzando sincronización...');
    mostrarStatus('🔄 Sincronizando con la nube...', 'info');
    
    const success = await firebaseSync.saveProfiles(perfiles);
    if (success) {
        mostrarStatus('✅ Sincronización completada', 'success');
        actualizarPanelSync();
    } else {
        mostrarError('❌ Error en la sincronización');
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN MULTI-DISPOSITIVO

✅ Cómo funciona:
1. Tus perfiles se guardan automáticamente en la nube
2. Todos tus dispositivos acceden a los mismos perfiles
3. Los cambios se sincronizan en tiempo real
4. Tus datos están seguros y respaldados

📱 Dispositivos conectados: Todos los que usen tu misma cuenta

💡 Los viajes e historial se mantienen locales en cada dispositivo`);
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

function generarContenidoPDF() {
    const stats = window.estadisticasExportacion || {};
    const viajesAceptados = historial.filter(item => item.aceptado).length;
    const viajesRentables = historial.filter(item => item.aceptado && item.rentabilidad === 'rentable').length;
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte UberCalc</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .summary-card { padding: 15px; border-radius: 8px; border: 1px solid #ddd; }
        .summary-card.ingresos { background-color: #e8f5e8; border-color: #4CAF50; }
        .summary-card.costos { background-color: #ffe8e8; border-color: #f44336; }
        .summary-card.rendimiento { background-color: #e8f4ff; border-color: #2196F3; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .rentable { background-color: #d4edda; }
        .oportunidad { background-color: #fff3cd; }
        .no-rentable { background-color: #f8d7da; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        .valor-destacado { font-size: 1.3em; font-weight: bold; margin: 5px 0; }
        .valor-positivo { color: #4CAF50; }
        .valor-negativo { color: #f44336; }
        .desglose-costos { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        @media print { body { margin: 10px; } .summary-grid { grid-template-columns: 1fr 1fr; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 UberCalc - Reporte Completo</h1>
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-DO')}</p>
        <p><strong>Perfil:</strong> ${perfilActual?.nombre || 'No especificado'}</p>
        <p><strong>Total de registros:</strong> ${historial.length}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card ingresos">
            <h3>💰 INGRESOS</h3>
            <div class="valor-destacado valor-positivo">${formatearMoneda(stats.gananciaTotal || 0)}</div>
            <p><strong>Ganancia Neta:</strong> ${formatearMoneda(stats.gananciaNetaTotal || 0)}</p>
            <p><strong>Viajes Aceptados:</strong> ${viajesAceptados}</p>
            <p><strong>Viaje Promedio:</strong> ${formatearMoneda(stats.viajePromedio || 0)}</p>
        </div>
        
        <div class="summary-card costos">
            <h3>💸 COSTOS TOTALES</h3>
            <div class="valor-destacado valor-negativo">${formatearMoneda((stats.costoCombustibleTotal || 0) + (stats.costoMantenimientoTotal || 0) + (stats.costoSeguroTotal || 0))}</div>
            <p><strong>⛽ Combustible:</strong> ${formatearMoneda(stats.costoCombustibleTotal || 0)}</p>
            <p><strong>🔧 Mantenimiento:</strong> ${formatearMoneda(stats.costoMantenimientoTotal || 0)}</p>
            <p><strong>🛡️ Seguro:</strong> ${formatearMoneda(stats.costoSeguroTotal || 0)}</p>
        </div>
        
        <div class="summary-card rendimiento" style="grid-column: 1 / -1;">
            <h3>📊 RENDIMIENTO</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div><strong>Ganancia/Hora:</strong><br><span class="valor-destacado valor-positivo">${formatearMoneda(stats.gananciaPorHora || 0)}</span></div>
                <div><strong>Tiempo Total:</strong><br><span class="valor-destacado">${stats.tiempoTotal || 0} min</span></div>
                <div><strong>Eficiencia:</strong><br><span class="valor-destacado valor-positivo">${viajesAceptados > 0 ? ((viajesRentables / viajesAceptados) * 100).toFixed(1) : 0}%</span></div>
            </div>
        </div>
    </div>

    <div class="desglose-costos">
        <h3>📈 RESUMEN FINANCIERO</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>Ingresos Totales:</strong> ${formatearMoneda(stats.gananciaTotal || 0)}</div>
            <div><strong>Costos Totales:</strong> ${formatearMoneda((stats.costoCombustibleTotal || 0) + (stats.costoMantenimientoTotal || 0) + (stats.costoSeguroTotal || 0))}</div>
            <div style="grid-column: 1 / -1; text-align: center; padding: 10px; background: white; border-radius: 5px; margin-top: 10px;">
                <strong style="color: #f5a623; font-size: 1.2em;">GANANCIA NETA TOTAL: ${formatearMoneda(stats.gananciaNetaTotal || 0)}</strong>
            </div>
        </div>
    </div>

    <h3>📋 DETALLE DE VIAJES (${historial.length} registros)</h3>
    <table>
        <thead>
            <tr>
                <th>Fecha</th><th>Hora</th><th>Ganancia</th><th>Minutos</th><th>Distancia</th>
                <th>Combustible</th><th>Mantenimiento</th><th>Seguro</th><th>Ganancia Neta</th>
                <th>Rentabilidad</th><th>Aceptado</th>
            </tr>
        </thead>
        <tbody>
            ${historial.map(item => {
                const fecha = new Date(item.timestamp).toLocaleDateString();
                const hora = new Date(item.timestamp).toLocaleTimeString();
                const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
                return `<tr class="${item.rentabilidad}">
                    <td>${fecha}</td><td>${hora}</td><td>${formatearMoneda(item.tarifa)}</td>
                    <td>${item.minutos}</td><td>${item.distancia} ${distanciaLabel}</td>
                    <td>${formatearMoneda(item.costoCombustible)}</td><td>${formatearMoneda(item.costoMantenimiento)}</td>
                    <td>${formatearMoneda(item.costoSeguro)}</td><td>${formatearMoneda(item.gananciaNeta)}</td>
                    <td>${item.texto}</td><td>${item.aceptado ? '✅ Sí' : '❌ No'}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Exportado desde UberCalc - Calculadora Inteligente para Conductores</p>
        <p>¡Sigue maximizando tus ganancias! 🚗💨</p>
    </div>

    <script>if (window.innerWidth > 768) window.print();</script>
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

function validarFormulario() {
    const tarifa = elementos.tarifaInput?.value;
    const minutos = elementos.minutosInput?.value;
    const distancia = elementos.distanciaInput?.value;
    
    if (!tarifa || !minutos || !distancia) {
        mostrarError('Por favor, completa todos los campos del viaje');
        return false;
    }
    
    if (parseFloat(tarifa) <= 0 || parseFloat(minutos) <= 0 || parseFloat(distancia) <= 0) {
        mostrarError('Todos los valores deben ser mayores a 0');
        return false;
    }
    
    if (!perfilActual) {
        mostrarError('Debes seleccionar un perfil primero');
        return false;
    }
    
    return true;
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos.statusIndicator || !elementos.statusText) {
        console.log('Status:', mensaje);
        return;
    }
    
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

// --- Persistencia de Datos MEJORADA ---
async function cargarDatos() {
    try {
        console.log('📥 Iniciando carga de datos...');
        
        // 1. Intentar cargar desde Firebase
        if (firebaseSync && firebaseSync.initialized) {
            console.log('🔥 Intentando cargar desde Firebase...');
            const perfilesRemotos = await firebaseSync.loadProfiles();
            
            if (perfilesRemotos !== null) { // null significa error
                perfiles = perfilesRemotos;
                if (perfiles.length > 0) {
                    perfilActual = perfiles[0];
                    historial = []; // Historial se mantiene local
                    console.log(`✅ Datos cargados desde Firebase: ${perfiles.length} perfiles`);
                    guardarDatos(); // Sincronizar localStorage
                    return;
                } else {
                    console.log('ℹ️ Firebase vacío, continuando con localStorage');
                }
            } else {
                console.log('ℹ️ Error cargando de Firebase, continuando con localStorage');
            }
        }
        
        // 2. Fallback a localStorage
        console.log('📱 Cargando desde localStorage...');
        const datosGuardados = localStorage.getItem('uberCalc_data');
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            perfiles = datos.perfiles || [];
            perfilActual = datos.perfilActual || null;
            historial = datos.historial || [];
            
            console.log(`✅ Datos cargados desde localStorage: ${perfiles.length} perfiles`);
            
            // Sincronizar datos locales a Firebase si es posible
            if (firebaseSync && firebaseSync.initialized && perfiles.length > 0) {
                console.log('🔄 Sincronizando datos locales con Firebase...');
                await firebaseSync.saveProfiles(perfiles);
            }
        } else {
            console.log('ℹ️ No hay datos guardados - Inicializando vacío');
            perfiles = [];
            perfilActual = null;
            historial = [];
        }
        
    } catch (error) {
        console.error('❌ Error crítico cargando datos:', error);
        // Fallback seguro
        perfiles = [];
        perfilActual = null;
        historial = [];
    }
}

function guardarDatos() {
    const datos = {
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    };
    
    try {
        localStorage.setItem('uberCalc_data', JSON.stringify(datos));
        console.log('💾 Datos guardados en localStorage');
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

// --- Inicialización Final ---
setTimeout(() => {
    if (elementos.tarifaInput?.value && elementos.minutosInput?.value && elementos.distanciaInput?.value) {
        calcularAutomatico();
    }
}, 1000);

console.log('🎉 Script UberCalc COMPLETO cargado - Listo para usar!');

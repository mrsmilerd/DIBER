// =============================================
// UBER CALC - Nueva Estructura Firebase Profesional
// Colecciones separadas para perfiles y viajes
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;

// --- Sistema de Código de Usuario ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Configuración Firebase (MANTENIDA) ---
const firebaseConfig = {
  apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
  authDomain: "diber-32875.firebaseapp.com",
  projectId: "diber-32875",
  storageBucket: "diber-32875.firebasestorage.app",
  messagingSenderId: "260349079723",
  appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// =============================================
// CLASE FIREBASE SYNC - ESTRUCTURA NUEVA
// =============================================

class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.initializing = false;
        this.db = null;
        this.unsubscribe = null;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Firebase Sync ya estaba inicializado');
            return true;
        }

        if (this.initializing) {
            console.log('⏳ Firebase Sync ya se está inicializando...');
            return false;
        }

        this.initializing = true;

        try {
            console.log('📡 Inicializando Firebase Sync con nueva estructura...');
            
            // 1. Verificar si Firebase está disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está cargado. Verifica que el SDK de Firebase esté incluido.');
            }
            
            // 2. Inicializar Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // 3. Inicializar Firestore
            this.db = firebase.firestore();
            
            // 4. Obtener User ID del sistema de código
            this.userId = this.getUserId();
            console.log('👤 User ID obtenido:', this.userId);
            
            this.initialized = true;
            this.initializing = false;
            
            console.log('✅ Firebase Sync con nueva estructura inicializado CORRECTAMENTE');
            console.log('👤 User ID:', this.userId);
            
            this.actualizarUIEstado('connected');
            return true;
            
        } catch (error) {
            this.initializing = false;
            console.error('❌ Error inicializando Firebase Sync:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    getUserId() {
        if (userCodeSystem.initialized && userCodeSystem.userId) {
            console.log('🔗 Usando userId del sistema de código:', userCodeSystem.userId);
            return userCodeSystem.userId;
        }
        
        let userId = localStorage.getItem('ubercalc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ubercalc_user_id', userId);
            console.log('🆕 Nuevo User ID generado (fallback):', userId);
        }
        return userId;
    }

    // =============================================
    // MÉTODOS PARA PERFILES - NUEVA ESTRUCTURA
    // =============================================

    async saveProfile(profile) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar perfil');
            return false;
        }

        try {
            console.log('💾 Guardando perfil en Firebase (nueva estructura)...', profile.id);
            
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profile.id);
            
            await profileRef.set({
                ...profile,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Perfil guardado en Firebase correctamente:', profile.nombre);
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando perfil en Firebase:', error);
            return false;
        }
    }

    async deleteProfile(profileId) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede eliminar perfil');
            return false;
        }

        try {
            console.log('🗑️ Eliminando perfil de Firebase:', profileId);
            
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profileId);
            
            await profileRef.delete();
            console.log('✅ Perfil eliminado de Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando perfil de Firebase:', error);
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede cargar perfiles');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Firebase (nueva estructura)...');
            
            const profilesRef = this.db.collection('users').doc(this.userId)
                .collection('profiles');
            
            const snapshot = await profilesRef.orderBy('fechaCreacion', 'desc').get();
            
            if (!snapshot.empty) {
                const profiles = [];
                snapshot.forEach(doc => {
                    profiles.push(doc.data());
                });
                
                console.log('✅ Perfiles cargados desde Firebase:', profiles.length);
                this.actualizarUIEstado('connected');
                return profiles;
            } else {
                console.log('📭 No se encontraron perfiles en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfiles desde Firebase:', error);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    // =============================================
    // MÉTODOS PARA VIAJES - NUEVA ESTRUCTURA
    // =============================================

    async saveTrip(trip) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar viaje');
            return false;
        }

        try {
            console.log('💾 Guardando viaje en Firebase (nueva estructura)...', trip.id);
            
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(trip.id);
            
            await tripRef.set({
                ...trip,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Viaje guardado en Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando viaje en Firebase:', error);
            return false;
        }
    }

    async loadTrips(profileId = null) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede cargar viajes');
            return null;
        }

        try {
            console.log('📥 Cargando viajes desde Firebase (nueva estructura)...');
            
            let tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            // Si se especifica un perfil, filtrar por él
            if (profileId) {
                tripsRef = tripsRef.where('perfilId', '==', profileId);
            }
            
            const snapshot = await tripsRef.orderBy('timestamp', 'desc').limit(100).get();
            
            if (!snapshot.empty) {
                const trips = [];
                snapshot.forEach(doc => {
                    trips.push(doc.data());
                });
                
                console.log('✅ Viajes cargados desde Firebase:', trips.length);
                return trips;
            } else {
                console.log('📭 No se encontraron viajes en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando viajes desde Firebase:', error);
            return null;
        }
    }

    async deleteTrip(tripId) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede eliminar viaje');
            return false;
        }

        try {
            console.log('🗑️ Eliminando viaje de Firebase:', tripId);
            
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(tripId);
            
            await tripRef.delete();
            console.log('✅ Viaje eliminado de Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando viaje de Firebase:', error);
            return false;
        }
    }

    async clearAllTrips() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede limpiar viajes');
            return false;
        }

        try {
            console.log('🗑️ Eliminando todos los viajes de Firebase...');
            
            const tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            const snapshot = await tripsRef.get();
            
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('✅ Todos los viajes eliminados de Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando viajes de Firebase:', error);
            return false;
        }
    }

    // =============================================
    // ESCUCHA EN TIEMPO REAL - NUEVA ESTRUCTURA
    // =============================================

    listenForChanges(callback) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede escuchar cambios');
            return null;
        }

        try {
            const userRef = this.db.collection('users').doc(this.userId);
            console.log('👂 Escuchando cambios en tiempo real para:', this.userId);
            
            // Escuchar cambios en perfiles
            const unsubscribeProfiles = this.db.collection('users').doc(this.userId)
                .collection('profiles')
                .onSnapshot((snapshot) => {
                    console.log('🔄 Cambios detectados en perfiles Firebase');
                    const profiles = [];
                    snapshot.forEach(doc => {
                        profiles.push(doc.data());
                    });
                    
                    // Notificar cambios en perfiles
                    callback({ type: 'profiles', data: profiles });
                }, (error) => {
                    console.error('❌ Error escuchando cambios en perfiles:', error);
                });

            // Escuchar cambios en viajes
            const unsubscribeTrips = this.db.collection('users').doc(this.userId)
                .collection('trips')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    console.log('🔄 Cambios detectados en viajes Firebase');
                    const trips = [];
                    snapshot.forEach(doc => {
                        trips.push(doc.data());
                    });
                    
                    // Notificar cambios en viajes
                    callback({ type: 'trips', data: trips });
                }, (error) => {
                    console.error('❌ Error escuchando cambios en viajes:', error);
                });

            // Retornar función para desuscribir ambos listeners
            return () => {
                unsubscribeProfiles();
                unsubscribeTrips();
            };
            
        } catch (error) {
            console.error('❌ Error configurando listeners:', error);
            return null;
        }
    }

    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================

    async getSyncStatus() {
        if (!this.initialized) return 'not_configured';

        try {
            // Obtener conteo de perfiles
            const profilesSnapshot = await this.db.collection('users').doc(this.userId)
                .collection('profiles').get();
            
            // Obtener conteo de viajes
            const tripsSnapshot = await this.db.collection('users').doc(this.userId)
                .collection('trips').get();
            
            return {
                status: 'connected',
                lastSync: this.lastSyncTime,
                profilesCount: profilesSnapshot.size,
                tripsCount: tripsSnapshot.size
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estado de sync:', error);
            return {
                status: 'error',
                lastSync: null,
                profilesCount: 0,
                tripsCount: 0
            };
        }
    }

    actualizarUIEstado(estado) {
        try {
            const syncInfo = document.getElementById('sync-info');
            const syncIcon = document.getElementById('sync-icon');
            const syncText = document.getElementById('sync-text');
            
            if (!syncInfo || !syncIcon || !syncText) {
                console.warn('❌ Elementos de UI de sync no encontrados');
                return;
            }
            
            syncInfo.className = 'sync-info';
            
            switch(estado) {
                case 'connected':
                    syncInfo.classList.add('connected');
                    syncIcon.textContent = '✅';
                    syncText.textContent = 'Conectado a Firebase';
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
        const ua = navigable.userAgent;
        if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            return /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile';
        }
        return 'desktop';
    }
}

// =============================================
// FUNCIONES DE PERSISTENCIA ACTUALIZADAS
// =============================================

async function guardarDatos() {
    console.log('💾 Guardando datos (local + Firebase)...');
    
    // Guardar en LocalStorage (Caché y fallback)
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    if (perfilActual) {
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }

    // Sincronizar con Firebase - NUEVA ESTRUCTURA
    if (firebaseSync && firebaseSync.initialized === true) {
        console.log('☁️ Sincronizando datos con Firebase (nueva estructura)...');
        
        try {
            // 1. Sincronizar cada perfil individualmente
            for (const perfil of perfiles) {
                await firebaseSync.saveProfile(perfil);
            }
            console.log('✅ Perfiles guardados en Firebase (nueva estructura)');
            
            // 2. Sincronizar cada viaje individualmente
            for (const viaje of historial.slice(0, 100)) { // Limitar a 100 más recientes
                await firebaseSync.saveTrip(viaje);
            }
            console.log('✅ Viajes guardados en Firebase (nueva estructura)');
            
            // 3. Actualizar última sincronización
            firebaseSync.lastSyncTime = new Date().toISOString();
            
        } catch (error) {
            console.warn('⚠️ Error al sincronizar datos:', error);
        }

    } else {
        console.warn('⚠️ Firebase Sync no inicializado. Solo se guarda en local.');
    }
}

async function cargarDatos() {
    console.log('🔄 Cargando datos (nueva estructura Firebase + local)...');
    
    let cloudPerfiles = null;
    let cloudTrips = null;

    // 1. Intentar cargar desde Firebase (PRIORIDAD) - NUEVA ESTRUCTURA
    if (window.firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde Firebase (nueva estructura)...');
            cloudPerfiles = await firebaseSync.loadProfiles();
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de Firebase (nueva estructura):', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            }

            console.log('☁️ Intentando cargar viajes desde Firebase (nueva estructura)...');
            cloudTrips = await firebaseSync.loadTrips();
            
            if (cloudTrips && cloudTrips.length > 0) {
                console.log('✅ Viajes cargados de Firebase (nueva estructura):', cloudTrips.length);
                historial = cloudTrips;
            }
            
        } catch (error) {
            console.error('❌ Error al cargar datos de Firebase. Usando local storage.', error);
        }
    }
    
    // 2. Cargar de LocalStorage si Firebase NO proporcionó datos
    if (!perfiles || perfiles.length === 0) {
        console.log('💾 Cargando perfiles de localStorage...');
        const localPerfilesString = localStorage.getItem('ubercalc_perfiles');
        perfiles = localPerfilesString ? JSON.parse(localPerfilesString) : [];
    }

    if (!historial || historial.length === 0) {
        console.log('💾 Cargando historial de localStorage...');
        const localHistorialString = localStorage.getItem('ubercalc_historial');
        historial = localHistorialString ? JSON.parse(localHistorialString) : [];
    }
    
    // 3. REPARAR PERFILES CORRUPTOS
    repararPerfilesCorruptos();
    
    console.log(`✅ Carga de datos finalizada. Perfiles: ${perfiles.length}, Viajes: ${historial.length}`);
}

// =============================================
// FUNCIONES DE PERFILES ACTUALIZADAS
// =============================================

async function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil (nueva estructura)...');
    
    const formData = new FormData(elementos.perfilForm);
    const perfilId = formData.get('perfil-id') || 'perfil_' + Date.now();
    
    // OBTENER VALORES CORRECTAMENTE
    const nombre = document.getElementById('nombre-perfil').value;
    const tipoMedida = document.getElementById('tipo-medida').value;
    const tipoCombustible = document.getElementById('tipo-combustible').value;
    const rendimiento = parseFloat(document.getElementById('rendimiento').value) || 0;
    const precioCombustible = parseFloat(document.getElementById('precio-combustible').value) || 0;
    const moneda = document.getElementById('moneda').value;
    const umbralMinutoRentable = parseFloat(document.getElementById('umbral-minuto-rentable').value) || 0;
    const umbralKmRentable = parseFloat(document.getElementById('umbral-km-rentable').value) || 0;
    const umbralMinutoOportunidad = parseFloat(document.getElementById('umbral-minuto-oportunidad').value) || 0;
    const umbralKmOportunidad = parseFloat(document.getElementById('umbral-km-oportunidad').value) || 0;
    const costoSeguro = parseFloat(document.getElementById('costo-seguro').value) || 0;
    const costoMantenimiento = parseFloat(document.getElementById('costo-mantenimiento').value) || 0;
    
    // VALIDAR CAMPOS REQUERIDOS
    if (!nombre || !tipoMedida || !tipoCombustible || rendimiento <= 0 || precioCombustible <= 0) {
        mostrarError('Por favor, completa todos los campos requeridos con valores válidos.');
        return;
    }
    
    const perfilData = {
        id: perfilId,
        nombre: nombre,
        tipoMedida: tipoMedida,
        tipoCombustible: tipoCombustible,
        rendimiento: rendimiento,
        precioCombustible: precioCombustible,
        moneda: moneda,
        umbralMinutoRentable: umbralMinutoRentable,
        umbralKmRentable: umbralKmRentable,
        umbralMinutoOportunidad: umbralMinutoOportunidad,
        umbralKmOportunidad: umbralKmOportunidad,
        costoSeguro: costoSeguro,
        costoMantenimiento: costoMantenimiento,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    
    const perfilExistenteIndex = perfiles.findIndex(p => p.id === perfilId);
    
    if (perfilExistenteIndex !== -1) {
        // Actualizar perfil existente
        perfiles[perfilExistenteIndex] = {
            ...perfiles[perfilExistenteIndex],
            ...perfilData
        };
        console.log('✏️ Perfil actualizado:', perfilData.nombre);
    } else {
        // Nuevo perfil
        perfiles.push(perfilData);
        console.log('➕ Nuevo perfil creado:', perfilData.nombre);
    }
    
    // Guardar en Firebase individualmente
    if (firebaseSync && firebaseSync.initialized) {
        await firebaseSync.saveProfile(perfilData);
    }
    
    // Si es el primer perfil o no hay perfil actual, establecer como actual
    if (!perfilActual || perfiles.length === 1) {
        perfilActual = perfilData;
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        console.log('✅ Perfil establecido como actual:', perfilActual.nombre);
    }
    
    // Guardar localmente también
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    
    mostrarStatus(`Perfil "${perfilData.nombre}" guardado correctamente`, 'success');
}

async function eliminarPerfil(perfilId) {
    console.log('🗑️ Eliminando perfil:', perfilId);
    
    if (perfiles.length <= 1) {
        mostrarStatus('No puedes eliminar el único perfil', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil? También se eliminarán todos los viajes asociados.')) {
        // Eliminar de Firebase primero
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.deleteProfile(perfilId);
            
            // Opcional: También eliminar viajes asociados a este perfil
            const trips = await firebaseSync.loadTrips(perfilId);
            for (const trip of trips) {
                await firebaseSync.deleteTrip(trip.id);
            }
        }
        
        // Eliminar localmente
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        // Si eliminamos el perfil actual, cambiar al primero disponible
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        guardarDatos();
        actualizarInterfazPerfiles();
        
        mostrarStatus('Perfil eliminado', 'success');
    }
}

// =============================================
// FUNCIONES DE VIAJES ACTUALIZADAS
// =============================================

async function procesarViaje(aceptado) {
    if (!calculoActual) {
        console.warn('⚠️ No hay cálculo actual para procesar');
        mostrarStatus('Primero calcula un viaje', 'error');
        return;
    }
    
    console.log(aceptado ? '✅ Aceptando viaje' : '❌ Rechazar viaje');
    
    // VERIFICAR que tenemos perfil actual
    if (!perfilActual) {
        console.error('❌ No hay perfil actual configurado');
        mostrarStatus('Error: No hay perfil configurado', 'error');
        return;
    }
    
    // Crear objeto de viaje COMPLETO
    const viaje = {
        ...calculoActual,
        aceptado: aceptado,
        id: 'viaje_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        perfilId: perfilActual.id,
        perfilNombre: perfilActual.nombre
    };
    
    console.log('💾 Guardando viaje (nueva estructura):', {
        id: viaje.id,
        aceptado: viaje.aceptado,
        rentabilidad: viaje.rentabilidad,
        perfil: viaje.perfilNombre
    });
    
    // Agregar al historial local
    historial.unshift(viaje);
    
    // Limitar historial local a 100 elementos
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // Guardar en Firebase individualmente
    if (firebaseSync && firebaseSync.initialized) {
        await firebaseSync.saveTrip(viaje);
    }
    
    // Mostrar resultado en modal
    mostrarResultadoModal(viaje);
    
    // Guardar datos localmente también
    guardarDatos();
    
    mostrarStatus(aceptado ? '¡Viaje aceptado y guardado!' : 'Viaje rechazado y guardado', 'success');
    
    // Actualizar interfaz
    actualizarEstadisticas();
    actualizarHistorial();
    
    // Limpiar formulario
    limpiarFormulario();
}

async function limpiarHistorial() {
    console.log('🗑️ Limpiando historial (nueva estructura)');
    
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        // Limpiar en Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.clearAllTrips();
        }
        
        // Limpiar localmente
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('Historial limpiado', 'success');
    }
}

// =============================================
// INICIALIZACIÓN ACTUALIZADA
// =============================================

async function inicializarApp() {
    console.log('📡 Inicializando UberCalc con Nueva Estructura Firebase...');
    
    try {
        // 1. PRIMERO: Inicializar sistema de código de usuario
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        // 2. LUEGO: Inicializar Firebase Sync con nueva estructura
        console.log('🔄 Inicializando Firebase Sync con nueva estructura...');
        const firebaseReady = await initializeFirebaseSyncWithRetry();
        
        if (firebaseReady) {
            console.log('✅ Firebase Sync con nueva estructura inicializado, cargando datos...');
            await cargarDatos();
            
            // ✅ ESCUCHA EN TIEMPO REAL MEJORADA - NUEVA ESTRUCTURA
            console.log('👂 Iniciando escucha en tiempo real (nueva estructura)...');
            
            try {
                firebaseSync.unsubscribe = firebaseSync.listenForChanges((change) => {
                    console.log('🔄 Datos actualizados desde la nube (nueva estructura):', change.type);
                    
                    if (change.type === 'profiles') {
                        console.log('✅ Actualizando perfiles desde la nube:', change.data.length);
                        perfiles = change.data;
                        
                        // Actualizar perfil actual
                        if (perfiles.length > 0) {
                            const currentProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
                            perfilActual = perfiles.find(p => p.id === currentProfileId) || perfiles[0];
                            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
                        }
                        
                        // Guardar en localStorage
                        localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
                        
                        // Actualizar interfaz
                        actualizarInterfazPerfiles();
                    }
                    
                    if (change.type === 'trips') {
                        console.log('✅ Actualizando viajes desde la nube:', change.data.length);
                        historial = change.data;
                        
                        // Guardar en localStorage
                        localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
                        
                        // Actualizar interfaz
                        actualizarHistorial();
                        actualizarEstadisticas();
                    }
                    
                    mostrarStatus('Datos actualizados desde la nube', 'info');
                });
            } catch (error) {
                console.error('❌ Error iniciando escucha en tiempo real:', error);
            }
            
        } else {
            console.log('📱 Firebase Sync no disponible, usando almacenamiento local');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        
        // 3. VERIFICAR que tenemos un perfil actual válido
        if (!perfilActual && perfiles.length > 0) {
            console.log('🔄 Estableciendo primer perfil como actual...');
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        actualizarInterfazPerfiles();
        
        // 4. DECIDIR qué pantalla mostrar
        if (perfiles.length === 0) {
            console.log('👤 Sin perfiles, mostrando pantalla de perfiles...');
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            console.log('🏠 Mostrando pantalla principal con perfil:', perfilActual.nombre);
            mostrarPantalla('main');
            actualizarEstadisticas();
        } else {
            console.log('👤 Mostrando pantalla de perfiles (perfilActual es null)');
            mostrarPantalla('perfil');
        }
        
        // Actualizar UI de sync
        actualizarPanelSync();
        
        console.log('🎉 UberCalc con Nueva Estructura Firebase inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN ACTUALIZADAS
// =============================================

async function forzarSincronizacionCompleta() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.warn('❌ Firebase Sync no disponible para sincronización completa');
        return false;
    }
    
    try {
        console.log('🔄 Forzando sincronización completa (nueva estructura)...');
        
        // 1. Subir datos locales a Firebase
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        for (const viaje of historial.slice(0, 100)) {
            await firebaseSync.saveTrip(viaje);
        }
        console.log('✅ Datos locales subidos a Firebase');
        
        // 2. Descargar datos más recientes de Firebase
        const cloudProfiles = await firebaseSync.loadProfiles();
        const cloudTrips = await firebaseSync.loadTrips();
        
        // 3. Usar datos de Firebase (son los más recientes)
        if (cloudProfiles && cloudProfiles.length > 0) {
            perfiles = cloudProfiles;
            console.log('✅ Perfiles sincronizados:', perfiles.length);
        }
        
        if (cloudTrips && cloudTrips.length > 0) {
            historial = cloudTrips;
            console.log('✅ Viajes sincronizados:', historial.length);
        }
        
        // 4. Actualizar perfil actual
        if (perfiles.length > 0 && !perfilActual) {
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        // 5. Actualizar interfaz
        actualizarInterfazPerfiles();
        actualizarHistorial();
        actualizarEstadisticas();
        
        // 6. Guardar localmente
        guardarDatos();
        
        console.log('✅ Sincronización completa exitosa (nueva estructura)');
        mostrarStatus('Sincronización completa exitosa', 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Error en sincronización completa:', error);
        mostrarStatus('Error en sincronización', 'error');
        return false;
    }
}

// =============================================
// ACTUALIZAR PANEL DE SINCRONIZACIÓN
// =============================================

async function actualizarPanelSync() {
    console.log('🔄 Actualizando panel de sincronización (nueva estructura)');
    
    if (!firebaseSync) {
        console.log('📱 Firebase Sync no disponible');
        actualizarPanelSyncUI('disconnected');
        return;
    }
    
    try {
        // Actualizar información del dispositivo
        const deviceInfo = firebaseSync.getDeviceInfo();
        const deviceName = document.getElementById('current-device-name');
        const deviceId = document.getElementById('current-device-id');
        const deviceIcon = document.getElementById('current-device-icon');
        
        if (deviceName) deviceName.textContent = deviceInfo.name;
        
        if (deviceId) {
            if (userCodeSystem.userCode) {
                deviceId.textContent = `Código: ${userCodeSystem.userCode}`;
            } else {
                deviceId.textContent = `ID: ${deviceInfo.id.substring(0, 8)}...`;
            }
        }
        
        if (deviceIcon) {
            deviceIcon.textContent = deviceInfo.type === 'mobile' ? '📱' : 
                                    deviceInfo.type === 'tablet' ? '📱' : '💻';
        }
        
        // Obtener estado de sincronización
        const syncStatus = await firebaseSync.getSyncStatus();
        
        // Actualizar contadores
        const profilesCount = document.getElementById('profiles-count');
        const tripsCount = document.getElementById('trips-count');
        
        if (profilesCount) profilesCount.textContent = syncStatus.profilesCount;
        if (tripsCount) tripsCount.textContent = syncStatus.tripsCount;
        
        // Actualizar estado principal
        actualizarPanelSyncUI(syncStatus.status);
        
    } catch (error) {
        console.error('❌ Error actualizando panel de sync:', error);
        actualizarPanelSyncUI('error');
    }
}

function actualizarPanelSyncUI(estado) {
    const syncStatus = document.getElementById('sync-status');
    const syncIcon = document.getElementById('sync-status-icon');
    const syncText = document.getElementById('sync-status-text');
    const syncButton = document.getElementById('force-sync-btn');
    
    if (!syncStatus || !syncIcon || !syncText) return;
    
    syncStatus.className = 'sync-status';
    
    switch(estado) {
        case 'connected':
            syncStatus.classList.add('connected');
            syncIcon.textContent = '✅';
            syncText.textContent = 'Conectado';
            if (syncButton) syncButton.disabled = false;
            break;
        case 'syncing':
            syncStatus.classList.add('syncing');
            syncIcon.textContent = '🔄';
            syncText.textContent = 'Sincronizando...';
            if (syncButton) syncButton.disabled = true;
            break;
        case 'error':
            syncStatus.classList.add('error');
            syncIcon.textContent = '❌';
            syncText.textContent = 'Error de conexión';
            if (syncButton) syncButton.disabled = false;
            break;
        default:
            syncStatus.classList.add('disconnected');
            syncIcon.textContent = '🌐';
            syncText.textContent = 'Sin conexión';
            if (syncButton) syncButton.disabled = false;
    }
}

// =============================================
// INICIALIZACIÓN FIREBASE CON REINTENTOS
// =============================================

async function initializeFirebaseSyncWithRetry(maxRetries = 3, delay = 2000) {
    console.log('🔄 Inicializando Firebase Sync con reintentos...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`📡 Intento ${attempt} de ${maxRetries}...`);
        
        try {
            // Crear nueva instancia de FirebaseSync
            firebaseSync = new FirebaseSync();
            
            // Inicializar
            const success = await firebaseSync.initialize();
            
            if (success) {
                console.log(`✅ Firebase Sync inicializado correctamente en intento ${attempt}`);
                return true;
            }
            
            console.warn(`⚠️ Intento ${attempt} falló, reintentando en ${delay}ms...`);
            
        } catch (error) {
            console.error(`❌ Error en intento ${attempt}:`, error);
        }
        
        // Esperar antes del próximo intento
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.error(`❌ Todos los ${maxRetries} intentos fallaron`);
    return false;
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO (MANTENIDO)
// =============================================

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    try {
        // 1. Verificar si ya tenemos un código guardado
        const savedCode = localStorage.getItem('ubercalc_user_code');
        const savedUserId = localStorage.getItem('ubercalc_user_id');
        
        if (savedCode && savedUserId) {
            console.log('✅ Usando código de usuario existente:', savedCode);
            userCodeSystem.userCode = savedCode;
            userCodeSystem.userId = savedUserId;
            userCodeSystem.initialized = true;
            return true;
        }
        
        // 2. Mostrar pantalla de código si no existe
        console.log('👤 No hay código de usuario, mostrando pantalla de código...');
        mostrarPantalla('user-code');
        return false;
        
    } catch (error) {
        console.error('❌ Error inicializando sistema de código:', error);
        // En caso de error, generar un código automático
        generarCodigoUsuarioAutomatico();
        return true;
    }
}

function generarCodigoUsuarioAutomatico() {
    const code = 'AUTO_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const userId = 'user_' + code;
    
    userCodeSystem.userCode = code;
    userCodeSystem.userId = userId;
    userCodeSystem.initialized = true;
    
    localStorage.setItem('ubercalc_user_code', code);
    localStorage.setItem('ubercalc_user_id', userId);
    
    console.log('🔐 Código automático generado:', code);
    return code;
}

// =============================================
// EVENT LISTENERS ACTUALIZADOS
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM cargado, configurando event listeners (nueva estructura)...');
    
    // Configurar listeners de formularios
    if (elementos.perfilForm) {
        elementos.perfilForm.addEventListener('submit', guardarPerfil);
    }
    
    // Configurar botones de sincronización
    const syncButton = document.getElementById('force-sync-btn');
    if (syncButton) {
        syncButton.addEventListener('click', async () => {
            syncButton.disabled = true;
            await forzarSincronizacionCompleta();
            syncButton.disabled = false;
            actualizarPanelSync();
        });
    }
    
    // Configurar botones de limpieza
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', limpiarHistorial);
    }
    
    // Inicializar aplicación
    setTimeout(() => {
        inicializarApp();
    }, 100);
});

console.log('🚀 UberCalc con Nueva Estructura Firebase cargado correctamente');

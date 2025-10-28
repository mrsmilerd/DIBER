// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión con Sistema de Código de Usuario para Multi-Dispositivo
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let googleSync;

// --- Sistema de Código de Usuario ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Configuración Google Apps Script ---
// Usa tu URL real aquí.
const GOOGLE_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbzhDlVDb6B4nLnpgVuaPNk7hq6Srs5zGW2iqd4uiKnmBaLpk0_fyAUypNpwaoYJs0lZiQ/exec';
const LOCAL_SYNC_ENDPOINT = '/api/sync'; 
const GOOGLE_SCRIPT_URL = LOCAL_SYNC_ENDPOINT;


// =============================================
// PERSISTENCIA DE DATOS (FUNCIONES CRÍTICAS PARA LA SINCRONIZACIÓN)
// =============================================

/**
 * Guarda los arrays 'perfiles' e 'historial' en LocalStorage y los sincroniza con Google Sheets (Nube).
 * Historial de viajes incluido.
 */
function guardarDatos() {
    console.log('💾 Guardando datos en local storage...');
    
    // Guardar en LocalStorage (Caché y fallback)
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    if (perfilActual) {
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }

    // Sincronizar con Google Sheets (CORRECCIÓN: Incluye Historial)
    if (window.googleSync && googleSync.initialized) {
        console.log('☁️ Sincronizando datos con Google Sheets...');
        
        // 1. Sincronizar Perfiles
        googleSync.saveProfiles(perfiles) 
            .then(() => console.log('✅ Perfiles guardados en la nube'))
            .catch(error => console.warn('⚠️ Error al guardar perfiles:', error));

        // 2. Sincronizar Historial (CRÍTICO)
        if (typeof googleSync.saveHistory === 'function') {
             googleSync.saveHistory(historial)
                .then(() => console.log('✅ Historial guardado en la nube'))
                .catch(error => console.warn('⚠️ Error al guardar historial:', error));
        } else {
            console.warn('⚠️ googleSync.saveHistory no está definida. El historial NO se sincronizará.');
        }

    } else {
        console.warn('⚠️ Google Sync no inicializado o no disponible. Solo se guarda en local.');
    }
}

/**
 * Carga los datos, dando prioridad a Google Sheets (Nube) si el usuario tiene un código asociado.
 */
async function cargarDatos() {
    console.log('🔄 Cargando datos (local y nube)...');
    let cloudPerfiles = null;

    // 1. Intentar cargar desde la nube (PRIORIDAD)
    if (window.googleSync && googleSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde la nube...');
            cloudPerfiles = await googleSync.loadProfiles(); 
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de la nube:', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            } else if (window.userCodeSystem && userCodeSystem.initialized) {
                // Sube datos locales si el código no tiene nada en la nube (PC -> Primer Sync)
                const localPerfilesString = localStorage.getItem('ubercalc_perfiles');
                const localPerfiles = localPerfilesString ? JSON.parse(localPerfilesString) : [];

                if (localPerfiles.length > 0) {
                    console.log('⬆️ Nube vacía. Subiendo perfiles locales...');
                    await googleSync.saveProfiles(localPerfiles);
                    perfiles = localPerfiles;
                }
            }
            
            // 2. Cargar historial desde la nube (si existe la función)
            if (typeof googleSync.loadHistory === 'function') {
                const cloudHistorial = await googleSync.loadHistory();
                if (cloudHistorial && cloudHistorial.length > 0) {
                    historial = cloudHistorial;
                    console.log('✅ Historial cargado de la nube:', historial.length);
                }
            }
            
        } catch (error) {
            console.error('❌ Error al cargar datos de la nube. Usando local storage.', error);
        }
    }
    
    // 3. Cargar de LocalStorage si la nube NO proporcionó perfiles (fallback)
    if (!perfiles || perfiles.length === 0) {
        console.log('💾 Cargando perfiles de localStorage...');
        const localPerfilesString = localStorage.getItem('ubercalc_perfiles');
        perfiles = localPerfilesString ? JSON.parse(localPerfilesString) : [];
        
        // Cargar historial local (si no se cargó de la nube)
        const localHistorialString = localStorage.getItem('ubercalc_historial');
        historial = localHistorialString ? JSON.parse(localHistorialString) : [];
    }
    
    // 4. Establecer perfil actual
    const lastProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
    if (perfiles.length > 0) {
        perfilActual = perfiles.find(p => p.id === lastProfileId) || perfiles[0];
        if (perfilActual) {
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
    } else {
        perfilActual = null;
    }
    
    console.log(`✅ Carga de datos finalizada. Perfiles: ${perfiles.length}, Historial: ${historial.length}`);
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO - MULTIDISPOSITIVO
// =============================================

async function initializeUserCodeSystem() {
    // ... CÓDIGO ORIGINAL DE initializeUserCodeSystem
}

async function generateUserCode() {
    // ... CÓDIGO ORIGINAL DE generateUserCode
}

async function setUserCode(code) {
    // ... CÓDIGO ORIGINAL DE setUserCode
}

function showUserCodeModal() {
    // ... CÓDIGO ORIGINAL DE showUserCodeModal
}

function hideUserCodeModal() {
    // ... CÓDIGO ORIGINAL DE hideUserCodeModal
}

function showUserCodeBanner() {
    // ... CÓDIGO ORIGINAL DE showUserCodeBanner
}

function debugUserCodeModal() {
    // ... CÓDIGO ORIGINAL DE debugUserCodeModal
}

function pruebaDirectaGoogleSheets() {
    // ... CÓDIGO ORIGINAL DE pruebaDirectaGoogleSheets
}

// =============================================
// CÁLCULOS Y FUNCIONES DE CORE
// =============================================

async function calcularViaje(event) {
    // ... CÓDIGO ORIGINAL DE calcularViaje
}

function procesarViaje(aceptado) {
    // CÓDIGO CORREGIDO: Llama a guardarDatos() después de guardar el historial
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }
    
    if (aceptado) {
        guardarEnHistorial(calculoActual, true);
        mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        guardarEnHistorial(calculoActual, false);
        mostrarStatus('❌ Viaje rechazado', 'info');
    }
    
    // 🔑 SINCRONIZACIÓN DE HISTORIAL
    guardarDatos(); 
    
    actualizarEstadisticas();
    limpiarFormulario();
    cerrarModal();
    
    if (aceptado) {
        setTimeout(() => cambiarPestana('historial'), 500);
    }
}

async function guardarPerfil(event) {
    // CÓDIGO CORREGIDO: Llama a guardarDatos() después de guardar el perfil
    // ... CÓDIGO ORIGINAL DE guardarPerfil para obtener y validar datos
    
    // --- 2. Actualizar/Crear Perfil en el array ---
    const index = perfiles.findIndex(p => p.id === perfil.id);
    
    if (index > -1) {
        perfiles[index] = perfil;
        mostrarNotificacion('Perfil actualizado correctamente.', 'success');
    } else {
        perfiles.push(perfil);
        mostrarNotificacion('Nuevo perfil creado correctamente.', 'success');
    }
    
    // 🔑 SINCRONIZACIÓN DE PERFIL
    guardarDatos(); 

    // ... CÓDIGO ORIGINAL DE guardarPerfil para actualizar interfaz
}


// ... (Incluye aquí todas las demás funciones de tu proyecto: guardarEnHistorial, limpiarHistorial, actualizarEstadisticas, etc.)
// ... Por ejemplo, la función que causaba el error:

function actualizarSelectorPerfiles() {
    // ... CÓDIGO ORIGINAL DE actualizarSelectorPerfiles
}

// =============================================
// FUNCIÓN DE CONTROL DE SESIÓN (UBICACIÓN FINAL Y SEGURA)
// =============================================

/**
 * Inicia el proceso de cambio de usuario:
 * 1. Limpia el código, ID y datos de la sesión actual (perfiles/historial) de la memoria y LocalStorage.
 * 2. Muestra el modal para que el usuario ingrese un código nuevo o existente.
 * * NOTA: Colocada aquí al final para asegurar que todas las funciones de UI ya están definidas.
 */
function cambiarUsuario() {
    console.log('🔄 Iniciando cambio de usuario. Limpiando sesión y memoria...');
    
    // 1. Limpiar código y ID de usuario en LocalStorage
    localStorage.removeItem('ubercalc_user_code'); 
    localStorage.removeItem('ubercalc_user_id');
    localStorage.removeItem('uberCalc_data');
    
    // 2. Resetear el estado del sistema de sincronización en memoria
    userCodeSystem.userCode = null;
    userCodeSystem.userId = null;
    userCodeSystem.initialized = false;
    
    // 3. Reiniciar los arrays de datos en memoria (¡SOLUCIÓN AL ERROR DE PERFIL PERSISTENTE!)
    perfiles = [];
    perfilActual = null;
    historial = [];
    
    // 4. Resetear la interfaz (AHORA ESTA FUNCIÓN ESTARÁ DEFINIDA)
    actualizarSelectorPerfiles(); 
    
    // 5. Ocultar banners 
    const banner = document.getElementById('user-code-banner');
    const bannerMain = document.getElementById('user-code-banner-main');
    if (banner) banner.style.display = 'none';
    if (bannerMain) bannerMain.style.display = 'none';
    
    // 6. Mostrar el modal de código para la nueva entrada
    showUserCodeModal(); 
    
    console.log('✅ Sesión reiniciada. Los datos anteriores se borraron de la memoria.');
}


// =============================================
// CÓDIGO FINAL DE INICIALIZACIÓN Y LISTENERS
// =============================================

// --- Exposición Global (Asegúrate de que tus funciones estén aquí) ---
window.guardarDatos = guardarDatos;
window.cargarDatos = cargarDatos;
// ... (otras funciones originales)
window.actualizarSelectorPerfiles = actualizarSelectorPerfiles;
// ... (Otras asignaciones de funciones de UI)

// Nuevas funciones globales para el sistema de código
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.showUserCodeModal = showUserCodeModal;
window.debugUserCodeModal = debugUserCodeModal;
window.pruebaDirectaGoogleSheets = pruebaDirectaGoogleSheets;
window.cambiarUsuario = cambiarUsuario; // 👈 ¡CLAVE PARA EL HTML!

// --- Prevenir cierre accidental ---
window.addEventListener('beforeunload', function(e) {
    // ... CÓDIGO ORIGINAL
});

// --- Cerrar modal al hacer clic fuera ---
window.onclick = function(event) {
    // ... CÓDIGO ORIGINAL
}

// --- Forzar cálculo inicial si hay datos ---
setTimeout(() => {
    // ... CÓDIGO ORIGINAL
}, 100);

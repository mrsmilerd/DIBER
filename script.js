// =============================================
// FUNCIONES ACTUALIZADAS PARA DISEÑO MÓVIL
// =============================================

// Actualizar interfaz de perfiles para móvil
function actualizarInterfazPerfiles() {
    console.log('👤 Actualizando interfaz de perfiles móvil');
    
    const perfilesLista = document.getElementById('perfiles-lista');
    if (!perfilesLista) {
        console.warn('❌ Elemento perfiles-lista no encontrado');
        return;
    }
    
    perfilesLista.innerHTML = '';
    
    if (perfiles.length === 0) {
        perfilesLista.innerHTML = `
            <div class="empty-state">
                <p>No hay perfiles creados</p>
                <p class="small">Crea tu primer perfil para comenzar</p>
            </div>
        `;
        return;
    }
    
    perfiles.forEach(perfil => {
        if (!perfil || typeof perfil !== 'object') {
            console.warn('❌ Perfil inválido encontrado:', perfil);
            return;
        }
        
        const perfilElement = document.createElement('div');
        perfilElement.className = `mobile-profile-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        
        const unidadRendimiento = (perfil.tipoMedida === 'mi' ? 'mpg' : 'Km/Gl') || 'Km/Gl';
        const inicial = perfil.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'P';
        
        perfilElement.innerHTML = `
            <div class="profile-avatar">${inicial}</div>
            <div class="profile-info-mini">
                <div class="profile-name-mini">${perfil.nombre || 'Perfil sin nombre'}</div>
                <div class="profile-details-mini">${perfil.rendimiento || '0'} ${unidadRendimiento} • ${perfil.moneda || 'DOP'}</div>
            </div>
            <div class="profile-actions-mini">
                <button class="floating-btn secondary" onclick="editarPerfil('${perfil.id}')" style="width: 35px; height: 35px; font-size: 0.9em;">✏️</button>
                <button class="floating-btn ${perfil.id === perfilActual?.id ? 'primary' : 'secondary'}" onclick="seleccionarPerfil('${perfil.id}')" style="width: 35px; height: 35px; font-size: 0.9em;">
                    ${perfil.id === perfilActual?.id ? '✅' : '👉'}
                </button>
            </div>
        `;
        
        perfilesLista.appendChild(perfilElement);
    });
    
    console.log('✅ Interfaz de perfiles móvil actualizada');
}

// Actualizar historial para móvil
function actualizarHistorial() {
    console.log('📊 Actualizando historial móvil');
    
    const historyList = document.getElementById('history-list');
    if (!historyList) {
        console.warn('❌ Elemento history-list no encontrado');
        return;
    }
    
    historyList.innerHTML = '';
    
    if (historial.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <p>No hay viajes en el historial</p>
                <p class="small">Los viajes aceptados o rechazados aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    historial.forEach((viaje, index) => {
        const viajeElement = document.createElement('div');
        viajeElement.className = `mobile-history-item`;
        
        const fecha = new Date(viaje.timestamp).toLocaleDateString();
        const hora = new Date(viaje.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        viajeElement.innerHTML = `
            <div class="history-emoji-mini">${viaje.emoji}</div>
            <div class="history-info-mini">
                <div class="history-main-mini">${viaje.descripcion}</div>
                <div class="history-details-mini">
                    ${formatearMoneda(viaje.tarifa)} • ${viaje.minutos}min • ${viaje.distancia}${perfilActual?.tipoMedida || 'km'}
                </div>
                <div class="history-details-mini">${fecha} ${hora}</div>
            </div>
            <div class="history-status-mini ${viaje.aceptado ? 'accepted' : 'rejected'}">
                ${viaje.aceptado ? '✅' : '❌'}
            </div>
        `;
        
        historyList.appendChild(viajeElement);
    });
}

// Mostrar resultado modal móvil
function mostrarResultadoModal(resultado) {
    console.log('📊 Mostrando modal de resultado móvil');
    
    // Actualizar elementos del modal móvil
    const modalBadge = document.getElementById('modal-badge');
    const modalEmoji = document.getElementById('modal-emoji');
    const modalTexto = document.getElementById('modal-texto');
    const modalPorMinuto = document.getElementById('modal-por-minuto');
    const modalPorKm = document.getElementById('modal-por-km');
    
    if (modalBadge) {
        modalBadge.className = `result-badge-mini ${resultado.rentabilidad}`;
    }
    if (modalEmoji) modalEmoji.textContent = resultado.emoji;
    if (modalTexto) modalTexto.textContent = resultado.descripcion;
    if (modalPorMinuto) modalPorMinuto.textContent = resultado.gananciaPorMinuto.toFixed(2);
    if (modalPorKm) modalPorKm.textContent = resultado.gananciaPorKm.toFixed(2);
    
    // Mostrar modal
    const modalFondo = document.getElementById('modalFondo');
    if (modalFondo) {
        modalFondo.style.display = 'flex';
    }
    
    // Auto-ocultar después de 4 segundos
    setTimeout(() => {
        if (modalFondo && modalFondo.style.display === 'flex') {
            modalFondo.style.display = 'none';
        }
    }, 4000);
}

// Configurar event listeners para diseño móvil
function configurarEventListenersMovil() {
    console.log('📱 Configurando event listeners móvil');
    
    // Tabs móviles
    const mobileTabs = document.querySelectorAll('.mobile-tab');
    mobileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('📑 Cambiando a pestaña móvil:', tabId);
            
            // Actualizar tabs
            mobileTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Actualizar contenido
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-' + tabId).classList.add('active');
            
            // Actualizar datos si es necesario
            if (tabId === 'resumen') {
                actualizarEstadisticas();
            } else if (tabId === 'historial') {
                actualizarHistorial();
            }
        });
    });
    
    // Inputs para cálculo automático
    const inputs = ['tarifa', 'minutos', 'distancia'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', manejarCalculoAutomatico);
        }
    });
    
    // Botones flotantes
    const aceptarBtn = document.getElementById('aceptar-viaje-tab');
    const rechazarBtn = document.getElementById('rechazar-viaje-tab');
    
    if (aceptarBtn) {
        aceptarBtn.addEventListener('click', () => procesarViaje(true));
    }
    if (rechazarBtn) {
        rechazarBtn.addEventListener('click', () => procesarViaje(false));
    }
    
    // Botones del modal
    const aceptarModal = document.getElementById('aceptar-viaje');
    const rechazarModal = document.getElementById('rechazar-viaje');
    
    if (aceptarModal) {
        aceptarModal.addEventListener('click', () => procesarViaje(true));
    }
    if (rechazarModal) {
        rechazarModal.addEventListener('click', () => procesarViaje(false));
    }
    
    // Navegación de perfiles
    const nuevoPerfilBtn = document.getElementById('nuevo-perfil-btn');
    const volverPerfilesBtn = document.getElementById('volver-perfiles');
    const cancelarPerfilBtn = document.getElementById('cancelar-perfil');
    const cambiarPerfilBtn = document.getElementById('cambiar-perfil');
    
    if (nuevoPerfilBtn) {
        nuevoPerfilBtn.addEventListener('click', () => mostrarConfigPerfil());
    }
    if (volverPerfilesBtn) {
        volverPerfilesBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (cancelarPerfilBtn) {
        cancelarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (cambiarPerfilBtn) {
        cambiarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    
    // Tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', alternarTema);
    }
    
    // Historial
    const clearHistoryBtn = document.getElementById('clear-history');
    const exportarHistorialBtn = document.getElementById('exportar-historial');
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', limpiarHistorial);
    }
    if (exportarHistorialBtn) {
        exportarHistorialBtn.addEventListener('click', () => {
            mostrarStatus('Exportación disponible en versión web', 'info');
        });
    }
    
    // Formulario de perfil
    const perfilForm = document.getElementById('perfil-form');
    if (perfilForm) {
        perfilForm.addEventListener('submit', guardarPerfil);
    }
    
    console.log('✅ Event listeners móvil configurados');
}

// Mostrar pantalla actualizada para móvil
function mostrarPantalla(pantalla) {
    console.log('🖥️ Mostrando pantalla móvil:', pantalla);
    
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar pantalla seleccionada
    switch(pantalla) {
        case 'perfil':
            const perfilScreen = document.getElementById('perfil-screen');
            if (perfilScreen) perfilScreen.classList.add('active');
            actualizarInterfazPerfiles();
            break;
        case 'config-perfil':
            const configScreen = document.getElementById('config-perfil-screen');
            if (configScreen) configScreen.classList.add('active');
            break;
        case 'main':
            const mainScreen = document.getElementById('main-screen');
            if (mainScreen) mainScreen.classList.add('active');
            if (perfilActual) {
                const perfilNombreElement = document.getElementById('perfil-actual-nombre');
                if (perfilNombreElement) {
                    perfilNombreElement.textContent = perfilActual.nombre;
                }
            }
            break;
    }
}

// Inicialización móvil
async function inicializarApp() {
    console.log('📱 Inicializando UberCalc Móvil...');
    
    try {
        // Configurar event listeners móviles primero
        configurarEventListenersMovil();
        
        // Resto de la inicialización (código de usuario, Firebase, etc.)
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        // Inicializar Firebase Sync
        const firebaseReady = await initializeFirebaseSyncWithRetry();
        
        if (firebaseReady) {
            console.log('✅ Firebase Sync móvil inicializado');
            await cargarDatos();
            
            // Configurar escucha en tiempo real
            try {
                firebaseSync.unsubscribe = firebaseSync.listenForChanges((change) => {
                    console.log('🔄 Datos actualizados desde la nube:', change.type);
                    
                    if (change.type === 'profiles') {
                        perfiles = change.data;
                        localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
                        actualizarInterfazPerfiles();
                    }
                    
                    if (change.type === 'trips') {
                        historial = change.data;
                        localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
                        actualizarHistorial();
                        actualizarEstadisticas();
                    }
                    
                    mostrarStatus('Datos actualizados', 'info');
                });
            } catch (error) {
                console.error('❌ Error escucha móvil:', error);
            }
            
        } else {
            console.log('📱 Usando almacenamiento local móvil');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        
        // Establecer perfil actual si es necesario
        if (!perfilActual && perfiles.length > 0) {
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        actualizarInterfazPerfiles();
        
        // Decidir pantalla inicial
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 Crea tu primer perfil', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
            actualizarEstadisticas();
        } else {
            mostrarPantalla('perfil');
        }
        
        console.log('🎉 UberCalc Móvil inicializado');
        
    } catch (error) {
        console.error('❌ Error inicialización móvil:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar. Recarga la página.', 'error');
    }
}

// Cerrar modal móvil
function cerrarModal() {
    console.log('❌ Cerrando modal móvil...');
    const modalFondo = document.getElementById('modalFondo');
    if (modalFondo) {
        modalFondo.style.display = 'none';
    }
}

// Reemplazar la inicialización original
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM cargado, inicializando versión móvil...');
    inicializarApp();
});

// =============================================
// MANTENER TODAS LAS DEMÁS FUNCIONES ORIGINALES
// (FirebaseSync, cálculos, persistencia, etc.)
// =============================================

// ... (el resto del código de Firebase y lógica permanece igual)

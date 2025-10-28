// =============================================
// MODIFICACIONES PARA MÓVIL
// =============================================

// Función para actualizar interfaz de perfiles (optimizada)
function actualizarInterfazPerfiles() {
    console.log('👤 Actualizando interfaz de perfiles móvil');
    
    if (!elementos.perfilesLista) {
        console.warn('❌ Elemento perfiles-lista no encontrado');
        return;
    }
    
    elementos.perfilesLista.innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos.perfilesLista.innerHTML = `
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
        perfilElement.className = `perfil-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        
        const unidadRendimiento = (perfil.tipoMedida === 'mi' ? 'mpg' : 'Km/Gl') || 'Km/Gl';
        
        perfilElement.innerHTML = `
            <div class="perfil-info">
                <h3>${perfil.nombre || 'Perfil sin nombre'}</h3>
                <p>${perfil.rendimiento || '0'} ${unidadRendimiento} • ${perfil.moneda || 'DOP'}</p>
            </div>
            <div class="perfil-actions">
                <button class="btn-icon" onclick="editarPerfil('${perfil.id}')">✏️</button>
                <button class="btn-icon" onclick="seleccionarPerfil('${perfil.id}')">${perfil.id === perfilActual?.id ? '✅' : '👉'}</button>
            </div>
        `;
        elementos.perfilesLista.appendChild(perfilElement);
    });
    
    console.log('✅ Interfaz de perfiles actualizada para móvil');
}

// Función para actualizar historial (optimizada)
function actualizarHistorial() {
    console.log('📊 Actualizando historial móvil');
    
    if (!elementos.historyList) {
        console.warn('❌ Elemento history-list no encontrado');
        return;
    }
    
    elementos.historyList.innerHTML = '';
    
    if (historial.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="empty-state">
                <p>No hay viajes en el historial</p>
                <p class="small">Los viajes aceptados o rechazados aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    historial.forEach((viaje, index) => {
        const viajeElement = document.createElement('div');
        viajeElement.className = `history-item ${viaje.rentabilidad}`;
        
        const fecha = new Date(viaje.timestamp).toLocaleDateString();
        const hora = new Date(viaje.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        viajeElement.innerHTML = `
            <div class="history-info">
                <h4>${viaje.descripcion}</h4>
                <p>${formatearMoneda(viaje.tarifa)} • ${viaje.minutos}min • ${viaje.distancia}${perfilActual?.tipoMedida || 'km'}</p>
                <p class="small">${fecha} ${hora}</p>
            </div>
            <div class="history-status ${viaje.aceptado ? 'accepted' : 'rejected'}">
                ${viaje.aceptado ? '✅' : '❌'}
            </div>
        `;
        
        elementos.historyList.appendChild(viajeElement);
    });
}

// Configurar event listeners optimizados para móvil
function configurarEventListeners() {
    console.log('📱 Configurando event listeners móvil...');
    
    // Sistema de Pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('📑 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
    
    // Cálculo Automático
    ['tarifa', 'minutos', 'distancia'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', manejarCalculoAutomatico);
        }
    });
    
    // Botones de Acción Principales
    const botonesAccion = [
        { id: 'aceptar-viaje', accion: () => procesarViaje(true) },
        { id: 'rechazar-viaje', accion: () => procesarViaje(false) },
        { id: 'aceptar-viaje-tab', accion: () => procesarViaje(true) },
        { id: 'rechazar-viaje-tab', accion: () => procesarViaje(false) }
    ];
    
    botonesAccion.forEach(({ id, accion }) => {
        const boton = document.getElementById(id);
        if (boton) {
            boton.addEventListener('click', accion);
        }
    });
    
    // Navegación
    const navegacion = [
        { id: 'nuevo-perfil-btn', accion: () => mostrarConfigPerfil() },
        { id: 'volver-perfiles', accion: () => mostrarPantalla('perfil') },
        { id: 'cancelar-perfil', accion: () => mostrarPantalla('perfil') },
        { id: 'cambiar-perfil', accion: () => mostrarPantalla('perfil') },
        { id: 'clear-history', accion: limpiarHistorial }
    ];
    
    navegacion.forEach(({ id, accion }) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('click', accion);
        }
    });
    
    // Tema
    if (elementos.themeToggle) {
        elementos.themeToggle.addEventListener('click', alternarTema);
    }
    
    // Formulario de perfil
    if (elementos.perfilForm) {
        elementos.perfilForm.addEventListener('submit', guardarPerfil);
    }
    
    console.log('✅ Event listeners móvil configurados');
}

// Inicialización optimizada para móvil
async function inicializarApp() {
    console.log('📱 Inicializando UberCalc para móvil...');
    
    try {
        configurarEventListeners();
        
        // Resto del código de inicialización permanece igual
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        const firebaseReady = await initializeFirebaseSyncWithRetry();
        
        if (firebaseReady) {
            console.log('✅ Firebase Sync inicializado para móvil');
            await cargarDatos();
            
            // Escucha en tiempo real
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
                console.error('❌ Error en escucha móvil:', error);
            }
            
        } else {
            console.log('📱 Usando almacenamiento local');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        
        if (!perfilActual && perfiles.length > 0) {
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        actualizarInterfazPerfiles();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 Crea tu primer perfil', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
            actualizarEstadisticas();
        } else {
            mostrarPantalla('perfil');
        }
        
        console.log('🎉 UberCalc móvil inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error en inicialización móvil:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar. Recarga la página.', 'error');
    }
}

// Reemplazar inicialización original
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM cargado, inicializando versión móvil...');
    inicializarApp();
});

// =============================================
// MANTENER TODAS LAS DEMÁS FUNCIONES ORIGINALES
// =============================================
// ... (el resto del código permanece igual)

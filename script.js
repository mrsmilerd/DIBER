// =============================================
// DIBER - Calculadora Inteligente para Conductores
// Versión Corregida y Sincronizada con HTML
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;
let filtroActual = 'hoy';
let Actual = null;

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

// --- Sistema de Tráfico ---
let trafficAnalyzer = null;
let trafficInitialized = false;

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

// =============================================
// CONSTANTE DE NEGOCIO
// =============================================
const TIEMPO_ESPERA_GRATIS_SEGUNDOS = 120; // 2 minutos (120 segundos)
const TARIFA_EXTRA_POR_MINUTO = 2.86; // $2.86 por minuto extra (Asumo esta tarifa, ajústala si es necesario)

// =============================================
// SISTEMA DE CRONÓMETRO PARA TIEMPOS REALES (ACTUALIZADO)
// =============================================
let cronometro = {
    activo: false,
    inicio: null,
    tiempoTranscurridoSegundos: 0,
    intervalo: null,
    viajeActual: null,
    
    // --- NUEVAS VARIABLES PARA EL SISTEMA DE ESPERA ---
    esperaActiva: false,
    intervaloEspera: null,
    estadoEspera: 'detenido', // 'detenido', 'countdown', 'cobro_extra'
    tiempoExtraCobradoSegundos: 0, // Tiempo acumulado DENTRO de la fase de 'cobro_extra'
    inicioEspera: null
};

// =============================================
// DEBUGGING TEMPORAL - ELIMINAR DESPUÉS
// =============================================

function debugCronometroCompleto() {
    console.log('🔍 === DEBUG CRONÓMETRO COMPLETO ===');
    console.log('⏱️ Cronómetro activo:', cronometro.activo);
    console.log('📦 Viaje actual:', cronometro.viajeActual);
    
    if (cronometro.viajeActual) {
        console.log('📊 Datos del viaje:', {
            tarifa: cronometro.viajeActual.tarifa,
            minutos: cronometro.viajeActual.minutos,
            tiempoEstimado: cronometro.viajeActual.tiempoEstimado,
            rentabilidad: cronometro.viajeActual.rentabilidad
        });
    }
    
    console.log('👤  actual:', perfilActual ? {
        nombre: perfilActual.nombre,
        umbralMinutoRentable: perfilActual.umbralMinutoRentable,
        umbralKmRentable: perfilActual.umbralKmRentable
    } : 'NO HAY PERFIL');
    
    console.log('📋 Historial reciente:', historial.slice(0, 3).map(v => ({
        minutos: v.minutos,
        tarifa: v.tarifa,
        rentabilidad: v.rentabilidad,
        tiempoRealCapturado: v.tiempoRealCapturado
    })));
    console.log('🔍 === FIN DEBUG ===');
}

// Ejecutar cada 5 segundos para debugging
setInterval(debugCronometroCompleto, 5000);

// =============================================
// FUNCIONES DEL SISTEMA DE CRONÓMETRO
// =============================================

// Efecto de pulso sutil en el tiempo
function agregarEfectosVisuales() {
    const tiempoDisplay = document.getElementById('cronometro-tiempo-display');
    if (tiempoDisplay) {
        // Efecto de pulso cada segundo
        setInterval(() => {
            tiempoDisplay.style.transform = 'scale(1.02)';
            setTimeout(() => {
                tiempoDisplay.style.transform = 'scale(1)';
            }, 100);
        }, 1000);
    }
}

function crearModalCronometro(resultado) {
    // Remover modal existente si hay
    const modalExistente = document.getElementById('modal-cronometro');
    if (modalExistente) {
        modalExistente.remove();
    }

    const modalFondo = document.createElement('div');
    modalFondo.id = 'modal-cronometro';
    modalFondo.className = 'modal-cronometro-fondo';
    
const tiempoUsuario = resultado.minutos;
const tiempoAjustado = resultado.tiempoAjustado || resultado.minutos;
const tiempoTotal = Math.max(tiempoUsuario, tiempoAjustado);

const porcentajeUsuario = calcularPorcentaje(tiempoUsuario, tiempoTotal);
const porcentajeAjustado = calcularPorcentaje(tiempoAjustado, tiempoTotal);
    
   modalFondo.innerHTML = `
        <div class="modal-cronometro-contenido estado-verde">
            <div class="cronometro-header">
                <div class="cronometro-titulo">
                    <span class="cronometro-icono">🚗</span>
                    <span>Viaje en Curso</span>
                </div>
                <div class="cronometro-tiempo-display" id="cronometro-tiempo-display">
                    00:00
                </div>

                <div class="espera-display" id="espera-display">
                    <span class="espera-estado" id="espera-estado">Esperando al usuario</span>
                    <span class="espera-tiempo" id="espera-tiempo">02:00</span>
                </div>
            </div>
            
            <!-- PROGRESO - CORREGIDO EL ORDEN -->
            <div class="cronometro-progreso">
                <div class="barra-progreso-container">
                    <div class="barra-progreso">
                        <div class="progreso-fill" id="progreso-fill"></div>
                    </div>
                    <div class="marcadores-tiempo">
<span class="marcador inicio">0</span>
<span class="marcador verde" style="left:${porcentajeUsuario}%;">${tiempoUsuario}</span>
<span class="marcador amarillo" style="left:${porcentajeAjustado}%;">${tiempoAjustado}</span>
                    </div>
                </div>
            </div>
              
            <!-- ACCIONES -->
            <div class="cronometro-acciones">
                <button class="btn-espera" id="btn-espera" onclick="manejarEspera()">
                    <span class="btn-icono">⏸️</span>
                    <span class="btn-texto">Iniciar Espera (2 min)</span>
                </button>

                <button class="btn-detener-viaje" onclick="detenerCronometro()">
                    <span class="btn-icono">🛑</span>
                    <span class="btn-texto">Finalizar Viaje</span>
                </button>
                
                <div class="info-extra-cobro" id="info-extra-cobro">
                    Extra acumulado: $0.00
                </div>
            </div>
        </div>
    `;
    
     document.body.appendChild(modalFondo);
    
    setTimeout(agregarEfectosVisuales, 100);
}

function calcularPorcentaje(tiempoBase, tiempoTotal) {
    const porcentaje = Math.min(100, (tiempoBase / tiempoTotal) * 100);
    console.log('🔢 Calculando porcentaje:', {
        tiempoBase,
        tiempoTotal,
        porcentaje
    });
    return porcentaje;
}

function iniciarCronometroConViaje(resultado) {
    if (cronometro.activo) {
        console.log('⏱️ Cronómetro ya activo');
        return;
    }

    // Cerrar modal rápido
    cerrarModalRapido();

const tiempoUsuario = parseFloat(elementos.minutos.value) || resultado.minutos;
const tiempoAjustado = resultado.tiempoAjustado || resultado.minutos;

// Tomamos el mayor para usarlo como referencia de la barra
const tiempoTotal = Math.max(tiempoUsuario, tiempoAjustado);

cronometro.viajeActual = {
    ...resultado,
    timestampInicio: new Date().toISOString(),
    tiempoEstimado: tiempoUsuario, // Tu estimación
    tiempoAjustado: tiempoAjustado, // Con tráfico
    tiempoBase: tiempoUsuario,
    tiempoMaximo: tiempoTotal // <-- CORREGIDO
};

    // Iniciar cronómetro
    cronometro.activo = true;
    cronometro.inicio = Date.now();
    cronometro.tiempoTranscurridoSegundos = 0;

    // Mostrar modal CON ORDEN GARANTIZADO
    crearModalCronometro({
        ...resultado,
        minutos: tiempoUsuario,
        tiempoAjustado: tiempoAjustado
    });
    
    // Actualizar cada segundo
    cronometro.intervalo = setInterval(actualizarCronometro, 1000);

    mostrarStatus('⏱️ Viaje iniciado', 'info');
}

function actualizarCronometro() {
    if (!cronometro.activo) return;

    cronometro.tiempoTranscurridoSegundos = Math.floor((Date.now() - cronometro.inicio) / 1000);
    const minutosTranscurridos = cronometro.tiempoTranscurridoSegundos / 60;
    
    const minutos = Math.floor(minutosTranscurridos);
    const segundos = cronometro.tiempoTranscurridoSegundos % 60;
    const tiempoFormateado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    
    // Actualizar tiempo en display
    const tiempoDisplay = document.getElementById('cronometro-tiempo-display');
    if (tiempoDisplay) {
        tiempoDisplay.textContent = tiempoFormateado;
    }
    
    // ✅ ACTUALIZAR COLORES SEGÚN PROGRESO (3 colores)
    actualizarColoresProgreso(minutosTranscurridos);
    
    // Actualizar barra de progreso
    actualizarBarraProgreso(minutosTranscurridos);
    
    // Actualizar texto de estado
    actualizarTextoEstado(minutosTranscurridos);
}

function actualizarTextoEstado(minutosTranscurridos) {
    const estadoElement = document.getElementById('cronometro-estado');
    if (!estadoElement || !cronometro.viajeActual) return;
    
    const { tiempoBase, tiempoMaximo } = cronometro.viajeActual;
    const estado = estadoElement.querySelector('.estado-texto');
    const icono = estadoElement.querySelector('.estado-icono');
    
    if (minutosTranscurridos <= tiempoBase) {
        estado.textContent = 'Dentro de tu tiempo estimado';
        icono.textContent = '✅';
    } else if (minutosTranscurridos <= tiempoMaximo) {
        estado.textContent = 'Dentro del tiempo con tráfico';
        icono.textContent = '⚠️';
    } else {
        estado.textContent = 'Tiempo excedido';
        icono.textContent = '🔴';
    }
}

function actualizarTextoEstado(minutosTranscurridos) {
    const estadoElement = document.getElementById('cronometro-estado');
    if (!estadoElement || !cronometro.viajeActual) return;
    
    const { tiempoBase, tiempoMaximo } = cronometro.viajeActual;
    const estado = estadoElement.querySelector('.estado-texto');
    const icono = estadoElement.querySelector('.estado-icono');
    
    if (minutosTranscurridos <= tiempoBase) {
        estado.textContent = 'Dentro de tu tiempo estimado';
        icono.textContent = '✅';
    } else if (minutosTranscurridos <= tiempoMaximo) {
        estado.textContent = 'Dentro del tiempo con tráfico';
        icono.textContent = '⚠️';
    } else {
        estado.textContent = 'Tiempo excedido';
        icono.textContent = '🔴';
    }
}

function actualizarColoresProgreso(minutosTranscurridos) {
    const modal = document.getElementById('modal-cronometro');
    if (!modal || !cronometro.viajeActual) return;
    
    const { tiempoBase, tiempoMaximo } = cronometro.viajeActual;
    
    console.log('🎨 Debug colores:', {
        minutosTranscurridos: minutosTranscurridos.toFixed(2),
        tiempoBase, // ✅ Este es el tiempo que ingresó el usuario
        tiempoMaximo, // ✅ Este es el tiempo con tráfico
        deberiaSerVerde: minutosTranscurridos <= tiempoBase,
        deberiaSerAmarillo: minutosTranscurridos > tiempoBase && minutosTranscurridos <= tiempoMaximo,
        deberiaSerRojo: minutosTranscurridos > tiempoMaximo
    });
    
    const modalContenido = modal.querySelector('.modal-cronometro-contenido');
    if (!modalContenido) return;
    
    // ✅ LÓGICA CORREGIDA - Usar tiempoBase (tu estimación)
    if (minutosTranscurridos <= tiempoBase) {
        // VERDE - Dentro de TU tiempo estimado
        modalContenido.className = 'modal-cronometro-contenido estado-verde';
        console.log('🟢 VERDE - Dentro de tu tiempo personal');
    } else if (minutosTranscurridos <= tiempoMaximo) {
        // AMARILLO - Dentro del tiempo del cálculo automático
        modalContenido.className = 'modal-cronometro-contenido estado-amarillo';
        console.log('🟡 AMARILLO - Dentro del tiempo con tráfico');
    } else {
        // ROJO - Pasó el tiempo del cálculo automático
        modalContenido.className = 'modal-cronometro-contenido estado-rojo';
        console.log('🔴 ROJO - Tiempo excedido');
    }
}

function actualizarBarraProgreso(minutosTranscurridos) {
    const progresoFill = document.getElementById('progreso-fill');
    if (!progresoFill || !cronometro.viajeActual) return;
    
    const { tiempoMaximo } = cronometro.viajeActual;
    const porcentaje = Math.min(100, (minutosTranscurridos / tiempoMaximo) * 100);
    
    progresoFill.style.width = `${porcentaje}%`;
}

// =============================================
// FUNCIONES DEL SISTEMA DE CRONÓMETRO - CORREGIDO
// =============================================

function detenerCronometro() {
    console.log('🛑 DETENIENDO CRONÓMETRO - INICIO');
    
    if (!cronometro.activo) {
        console.log('❌ No hay cronómetro activo');
        return;
    }

    // Detener cronómetro
    clearInterval(cronometro.intervalo);
    
    // 1. CÁLCULO DEL TIEMPO EXTRA COBRADO
    const tiempoExtra = cronometro.viajeActual?.tiempoExtraCobradoSegundos || 0;
    const tiempoTotalSegundos = cronometro.tiempoTranscurridoSegundos + tiempoExtra;
    const tiempoRealMinutos = tiempoTotalSegundos / 60; 

    // 2. CÁLCULO DE LA GANANCIA EXTRA COBRADA
    const minutosExtra = tiempoExtra / 60;
    const montoExtraCobrado = minutosExtra * TARIFA_EXTRA_POR_MINUTO; // Usando la constante $2.86/min

    // 3. CÁLCULO DE LA GANANCIA TOTAL FINAL
    const tarifaBase = parseFloat(cronometro.viajeActual.tarifa) || 0; // Los 100 originales
    const gananciaTotalFinal = tarifaBase + montoExtraCobrado; // <--- ¡LA SUMA CLAVE!
    
    console.log('💰 CÁLCULO DE GANANCIA FINAL:', {
        tarifaBase: tarifaBase,
        tiempoExtraSegundos: tiempoExtra,
        montoExtraCobrado: montoExtraCobrado,
        gananciaTotalFinal: gananciaTotalFinal
    });
    
    console.log('⏱️ Tiempo real capturado (sin extra):', (cronometro.tiempoTranscurridoSegundos / 60).toFixed(2), 'minutos');
    console.log('➕ Tiempo extra cobrado (segundos):', tiempoExtra);
    console.log('⏱️ Tiempo real final para métrica:', tiempoRealMinutos.toFixed(2), 'minutos');

    // ✅ VERIFICAR QUE TENEMOS DATOS
    if (!cronometro.viajeActual) {
        console.error('❌ NO hay viajeActual en cronómetro');
        return;
    }

    console.log('📦 Datos del viaje original:', {
        tarifa: cronometro.viajeActual.tarifa,
        tiempoEstimado: cronometro.viajeActual.tiempoEstimado,
        distancia: cronometro.viajeActual.distancia,
        rentabilidadOriginal: cronometro.viajeActual.rentabilidad
    });

    // ✅ CREAR NUEVO OBJETO CON DATOS REALES Y GANANCIA TOTAL
    const viajeConTiempoReal = {
        // Datos básicos del viaje
        tarifa: gananciaTotalFinal, // <--- ¡IMPORTANTE: Usar la ganancia TOTAL!
        ganancia: gananciaTotalFinal, // <--- ¡IMPORTANTE: Usar la ganancia TOTAL!
        distancia: cronometro.viajeActual.distancia || 1,
        
        // Tiempos
        tiempoReal: tiempoRealMinutos,
        tiempoEstimado: cronometro.viajeActual.tiempoEstimado,
        diferenciaTiempo: tiempoRealMinutos - cronometro.viajeActual.tiempoEstimado,

        // --- DETALLES DE COBRO EXTRA ---
        tiempoExtraCobradoSegundos: tiempoExtra, 
        montoExtraCobrado: montoExtraCobrado.toFixed(2),
        
        // Rentabilidad original para comparar
        rentabilidadOriginal: cronometro.viajeActual.rentabilidad,
        textoOriginal: cronometro.viajeActual.texto,
        
        // Metadata
        timestampFin: new Date().toISOString(),
        tiempoRealCapturado: true,
        
        // ✅ NUEVOS CAMPOS PARA EL HISTORIAL
        tarifaBase: tarifaBase, // Los 100 originales
        extras: montoExtraCobrado, // El extra cobrado
        gananciaTotal: gananciaTotalFinal // La suma total
    };

    console.log('✅ VIAJE FINAL CON EXTRAS:', {
        tarifaBase: viajeConTiempoReal.tarifaBase,
        extras: viajeConTiempoReal.extras,
        gananciaTotal: viajeConTiempoReal.gananciaTotal,
        tiempoExtraCobrado: viajeConTiempoReal.tiempoExtraCobradoSegundos
    });
    
    console.log('🔄 Procesando viaje con tiempo real...');
    procesarViajeConTiempoReal(viajeConTiempoReal);

    // Limpiar
    const modalCronometro = document.getElementById('modal-cronometro');
    if (modalCronometro) {
        modalCronometro.remove();
    }

    limpiarFormularioCompleto();
    
    // Resetear cronómetro
    cronometro.activo = false;
    cronometro.inicio = null;
    cronometro.tiempoTranscurridoSegundos = 0;
    cronometro.viajeActual = null;
    
    console.log('✅ Cronómetro detenido y procesado CON EXTRAS');
}

function debugCronometro() {
    if (!cronometro.activo || !cronometro.viajeActual) {
        console.log('❌ Cronómetro no activo');
        return;
    }
    
    const minutosTranscurridos = cronometro.tiempoTranscurridoSegundos / 60;
    const { tiempoBase, tiempoMaximo } = cronometro.viajeActual;
    
    console.log('🐛 DEBUG CRONÓMETRO:', {
        segundosTranscurridos: cronometro.tiempoTranscurridoSegundos,
        minutosTranscurridos: minutosTranscurridos.toFixed(2),
        tiempoBase,
        tiempoMaximo,
        deberiaSerVerde: minutosTranscurridos <= tiempoBase,
        deberiaSerAmarillo: minutosTranscurridos > tiempoBase && minutosTranscurridos <= tiempoMaximo,
        deberiaSerRojo: minutosTranscurridos > tiempoMaximo
    });
}

// Llamar debug cada 10 segundos durante pruebas
setInterval(() => {
    if (cronometro.activo) {
        debugCronometro();
    }
}, 10000);

// =============================================
// LÓGICA DE ESPERA (2 MINUTOS DE GRACIA + COBRO EXTRA)
// =============================================

function formatearTiempo(segundos) {
    const min = Math.floor(Math.abs(segundos) / 60);
    const sec = Math.abs(segundos) % 60;
    const signo = segundos < 0 ? '-' : '';
    return `${signo}${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

function manejarEspera() {
    if (!cronometro.esperaActiva) {
        iniciarEspera();
    } else {
        detenerEspera();
    }
}

function iniciarEspera() {
    if (cronometro.esperaActiva) return;

    // 1. Detener Cronómetro Principal y guardar el tiempo exacto transcurrido.
    clearInterval(cronometro.intervalo);
    cronometro.activo = false;
    
    // 💡 CLAVE: CAPTURAR EL TIEMPO FINAL ANTES DE PAUSAR
    // Si el cronómetro tiene un punto de inicio, calcula el tiempo transcurrido
    if (cronometro.inicio) {
         // cronometro.tiempoTranscurridoSegundos ahora almacena el tiempo real antes de la pausa.
         cronometro.tiempoTranscurridoSegundos = Math.floor((Date.now() - cronometro.inicio) / 1000);
         cronometro.inicio = null; // Reiniciamos el punto de inicio para que no interfiera.
    }

    // 2. Inicializar Variables de Espera
    cronometro.esperaActiva = true;
    cronometro.estadoEspera = 'countdown';
    cronometro.inicioEspera = Date.now();
    cronometro.tiempoExtraCobradoSegundos = cronometro.viajeActual?.tiempoExtraCobradoSegundos || 0;
    
    // 3. Iniciar Intervalo de Espera
    cronometro.intervaloEspera = setInterval(actualizarEspera, 1000);

    // 4. Actualizar Botón y Modal
    const btn = document.getElementById('btn-espera');
    if (btn) {
        btn.innerHTML = '<span class="btn-icono">▶️</span> <span class="btn-texto">Detener Espera</span>';
        btn.classList.add('btn-espera-active'); // Para estilo rojo en CSS
    }

    // Asegurar que la tarifa extra se inicialice en el objeto viajeActual
    if (cronometro.viajeActual) {
        cronometro.viajeActual.tiempoExtraCobradoSegundos = cronometro.tiempoExtraCobradoSegundos;
        mostrarStatus('⏸️ Cronómetro pausado. Cuenta Regresiva de 2 min iniciada.', 'warning');
    }
}

function actualizarEspera() {
    if (!cronometro.esperaActiva) return;

    const tiempoTranscurridoEspera = Math.floor((Date.now() - cronometro.inicioEspera) / 1000);
    const tiempoRestante = TIEMPO_ESPERA_GRATIS_SEGUNDOS - tiempoTranscurridoEspera;
    
    const displayTiempo = document.getElementById('espera-tiempo');
    const displayEstado = document.getElementById('espera-estado');
    const displayModal = document.querySelector('.modal-cronometro-contenido');

    if (tiempoRestante > 0) {
        // FASE 2: Cuenta Regresiva (Tiempo de Gracia)
        cronometro.estadoEspera = 'countdown';
        if (displayTiempo) displayTiempo.textContent = formatearTiempo(tiempoRestante);
        if (displayEstado) displayEstado.textContent = 'Tiempo de Gracia (2 min)';
        if (displayModal) displayModal.classList.remove('estado-rojo', 'estado-verde');
        if (displayModal) displayModal.classList.add('estado-amarillo');

} else {
        // FASE 3: Cobro Extra (Contando hacia arriba desde 0)
        cronometro.estadoEspera = 'cobro_extra';
        
        const tiempoCobroSegundos = tiempoTranscurridoEspera - TIEMPO_ESPERA_GRATIS_SEGUNDOS;
        
        // El cronometro.tiempoExtraCobradoSegundos mantiene el tiempo cobrable actual
        cronometro.tiempoExtraCobradoSegundos = tiempoCobroSegundos;

        // 💡 CLAVE: Sincronizar el dato más reciente con el viaje actual para persistencia.
        if (cronometro.viajeActual) {
            cronometro.viajeActual.tiempoExtraCobradoSegundos = tiempoCobroSegundos;
        }
        
        if (displayTiempo) displayTiempo.textContent = formatearTiempo(tiempoCobroSegundos);
        if (displayEstado) displayEstado.textContent = 'Cobro Extra por Minuto';
        if (displayModal) displayModal.classList.remove('estado-amarillo', 'estado-verde');
        if (displayModal) displayModal.classList.add('estado-rojo');
        
        // Actualizar la vista del extra acumulado
        actualizarDisplayCobroExtra();
    }
}

function detenerEspera() {
    if (!cronometro.esperaActiva) return;

    // 1. Detener el Intervalo de Espera
    clearInterval(cronometro.intervaloEspera);
    cronometro.esperaActiva = false;
    cronometro.estadoEspera = 'detenido';

    // 2. Guardar el tiempo extra COBRADO
    if (cronometro.viajeActual) {
        // Acumular el tiempo extra cobrado en el objeto del viaje
        // (Se usa la variable global actualizada en actualizarEspera)
        cronometro.viajeActual.tiempoExtraCobradoSegundos = cronometro.tiempoExtraCobradoSegundos;
    }
    
    // 3. Reanudar Cronómetro Principal
    cronometro.activo = true;

    // 💡 CLAVE: AJUSTAR EL PUNTO DE INICIO para ignorar el tiempo de espera.
    // El nuevo inicio es la hora actual menos el tiempo que *ya* ha contado.
    const tiempoContadoMs = cronometro.tiempoTranscurridoSegundos * 1000;
    cronometro.inicio = Date.now() - tiempoContadoMs; // <-- ¡ESTE ES EL ARREGLO!

    // Reanudar el intervalo principal.
    cronometro.intervalo = setInterval(actualizarCronometro, 1000);

    // 4. Actualizar Botón y Display
    const btn = document.getElementById('btn-espera');
    if (btn) {
        btn.innerHTML = '<span class="btn-icono">⏸️</span> <span class="btn-texto">Reanudar Espera</span>';
        btn.classList.remove('btn-espera-active');
    }
    
    mostrarStatus(`✅ Espera finalizada. ${formatearTiempo(cronometro.tiempoExtraCobradoSegundos)}s extra cobrados.`, 'info');
}

function actualizarDisplayCobroExtra() {
    const displayCobro = document.getElementById('info-extra-cobro');
    if (displayCobro) { 
        const tiempoExtra = cronometro.tiempoExtraCobradoSegundos || 0; 
        const minutosExtra = tiempoExtra / 60;
        const montoExtra = minutosExtra * TARIFA_EXTRA_POR_MINUTO;
        
        // Aseguramos el formato de moneda incluso si formatearMoneda no está definida
        const montoFormateado = (typeof formatearMoneda === 'function') ? formatearMoneda(montoExtra) : `$${montoExtra.toFixed(2)}`;

        displayCobro.textContent = `Cobro Extra acumulado: ${montoFormateado} (${minutosExtra.toFixed(1)} min)`;
        
        // UX: Mostrar el display si el cobro es positivo (ocultarlo o resetearlo si no hay cobro)
        if (tiempoExtra > 0) {
            displayCobro.style.display = 'block';
        } else {
             // Opcional: Ocultarlo cuando solo está en cuenta regresiva
             // Se puede manejar mejor con una clase CSS.
             displayCobro.style.display = 'none'; 
        }
    }
}

// =============================================
// SISTEMA MEJORADO DE RENTABILIDAD CON DATOS REALES
// =============================================

function procesarViajeConTiempoReal(viajeConTiempoReal) {
    console.log('🔄 PROCESAR VIAJE CON TIEMPO REAL - CON ANÁLISIS NETO DESDE PERFIL');
    
    // ✅ VERIFICAR PERFIL (EXISTENTE)
    if (!perfilActual) {
        console.error('❌ NO hay perfil activo');
        return;
    }
    
    // ✅ NUEVO: CÁLCULO NETO USANDO TU PERFIL
    const analisisNeto = calcularGananciaNetaRealDesdePerfil(
        viajeConTiempoReal.gananciaTotal || viajeConTiempoReal.tarifa,
        viajeConTiempoReal.distancia || 1,
        viajeConTiempoReal.tiempoReal
    );
    
    if (!analisisNeto) {
        console.error('❌ Error en cálculo neto');
        return;
    }
    
    // ✅ IMPACTO EN META 32K
    const impactoMeta = calcularImpactoEnMeta(analisisNeto.netoPorMinuto);
    
    console.log('💰 ANÁLISIS NETO DESDE PERFIL:', {
        perfil: perfilActual.nombre,
        tarifaBruta: analisisNeto.tarifaBruta,
        gananciaNeta: analisisNeto.gananciaNeta,
        netoPorMinuto: analisisNeto.netoPorMinuto,
        rentabilidadReal: analisisNeto.rentabilidadReal.texto,
        costoTotal: analisisNeto.costos.costoTotal,
        impactoMeta: impactoMeta.texto
    });
    
    // ✅ DECISIÓN: ¿Usar bruto o neto para la rentabilidad?
    // Opción A: Usar NETO (más realista)
    const gananciaParaCalculo = analisisNeto.gananciaNeta > 0 ? analisisNeto.gananciaNeta : 0;
    
    // ✅ CALCULAR RENTABILIDAD CON GANANCIA TOTAL (EXISTENTE)
    const gananciaTotal = viajeConTiempoReal.gananciaTotal || viajeConTiempoReal.tarifa;
    const gananciaPorMinutoReal = gananciaTotal / viajeConTiempoReal.tiempoReal;
    const gananciaPorKmReal = viajeConTiempoReal.distancia > 0 ? 
        gananciaTotal / viajeConTiempoReal.distancia : 0;

    // ✅ DETERMINAR RENTABILIDAD REAL CON GANANCIA TOTAL
    let rentabilidadReal, emojiReal, textoReal;

    if (gananciaPorMinutoReal >= perfilActual.umbralMinutoRentable && 
        gananciaPorKmReal >= perfilActual.umbralKmRentable) {
        rentabilidadReal = 'rentable';
        emojiReal = '✅';
        textoReal = 'RENTABLE';
    } else if (gananciaPorMinutoReal >= perfilActual.umbralMinutoOportunidad && 
               gananciaPorKmReal >= perfilActual.umbralKmOportunidad) {
        rentabilidadReal = 'oportunidad';
        emojiReal = '⚠️';
        textoReal = 'OPORTUNIDAD';
    } else {
        rentabilidadReal = 'no-rentable';
        emojiReal = '❌';
        textoReal = 'NO RENTABLE';
    }

    // ✅ CREAR VIAJE FINAL CON TODOS LOS DATOS
    const viajeFinal = {
        id: 'viaje_real_' + Date.now(),
        
        // Datos básicos CON EXTRAS INCLUIDOS (EXISTENTE)
        tarifa: gananciaTotal,
        ganancia: gananciaTotal,
        distancia: viajeConTiempoReal.distancia,
        
        // ✅ USAR TIEMPO REAL
        minutos: viajeConTiempoReal.tiempoReal,
        
        // ✅ RENTABILIDAD RECALCULADA
        rentabilidad: rentabilidadReal,
        rentable: rentabilidadReal === 'rentable',
        emoji: emojiReal,
        texto: textoReal,
        gananciaPorMinuto: parseFloat(gananciaPorMinutoReal.toFixed(2)),
        gananciaPorKm: parseFloat(gananciaPorKmReal.toFixed(2)),
        
        // Metadata (EXISTENTE)
        tiempoRealCapturado: true,
        tiempoReal: viajeConTiempoReal.tiempoReal,
        tiempoEstimado: viajeConTiempoReal.tiempoEstimado,
        diferenciaConEstimado: viajeConTiempoReal.diferenciaTiempo,
        fecha: new Date().toLocaleString('es-DO'),
        timestamp: new Date().toISOString(),
        aceptado: true,
        perfilId: perfilActual.id,
        perfilNombre: perfilActual.nombre,
        
        // Para comparación (EXISTENTE)
        rentabilidadOriginal: viajeConTiempoReal.rentabilidadOriginal,
        textoOriginal: viajeConTiempoReal.textoOriginal,
        
        // ✅ DETALLES DEL COBRO EXTRA (EXISTENTE)
        tiempoExtraCobradoSegundos: viajeConTiempoReal.tiempoExtraCobradoSegundos,
        montoExtraCobrado: viajeConTiempoReal.montoExtraCobrado,
        tarifaBase: viajeConTiempoReal.tarifaBase,
        extras: viajeConTiempoReal.extras,
        gananciaTotal: gananciaTotal,
        
        // ✅ NUEVOS CAMPOS NETOS (usando TU perfil) - ¡VERIFICA QUE NO FALTEN COMAS!
        gananciaNetaReal: analisisNeto.gananciaNeta,
        netoPorMinutoReal: analisisNeto.netoPorMinuto,
        costoTotalReal: analisisNeto.costos.costoTotal,
        rentabilidadReal: analisisNeto.rentabilidadReal,
        impactoMeta32k: impactoMeta,
        comparacionConPerfil: analisisNeto.comparacionConPerfil,
        
        // Costos detallados desde TU perfil
        costoCombustibleReal: analisisNeto.costos.combustible,
        costoMantenimientoReal: analisisNeto.costos.mantenimiento,
        costoSeguroReal: analisisNeto.costos.seguro,
        costoDepreciacionReal: analisisNeto.costos.depreciacion,
        costoPorKmReal: analisisNeto.costos.costoPorKm
    };

    console.log('📊 VIAJE FINAL CON ANÁLISIS NETO:', {
        gananciaBruta: viajeConTiempoReal.gananciaTotal,
        gananciaNeta: viajeFinal.gananciaNetaReal,
        netoPorMinuto: viajeFinal.netoPorMinutoReal,
        rentabilidadReal: viajeFinal.rentabilidadReal.texto,
        porcentajeNetoVsBruto: parseFloat(((analisisNeto.gananciaNeta / viajeConTiempoReal.gananciaTotal) * 100).toFixed(1)) + '%'
    });

    // ✅ GUARDAR DIRECTAMENTE
    agregarAlHistorialDirecto(viajeFinal);
}

function agregarAlHistorialDirecto(viaje) {
    console.log('💾 GUARDANDO DIRECTAMENTE EN HISTORIAL CON EXTRAS');
    
    // ✅ AGREGAR ALERTA VISUAL PARA EXTRAS
    if (viaje.extras > 0) {
        console.log('💰 EXTRAS DETECTADOS:', viaje.extras);
        mostrarStatus(`💰 ¡Se agregaron $${viaje.extras.toFixed(2)} en extras por tiempo de espera!`, 'success');
    }
    
    // Agregar al inicio del historial
    historial.unshift(viaje);
    
    // Limitar tamaño
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // Guardar en localStorage
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    console.log('✅ Guardado en localStorage. Nuevo total:', historial.length);
    console.log('✅ Verifica que la ganancia incluye extras:', viaje.ganancia);
    
    // Sincronizar si es necesario
    guardarDatos();
    
    // Actualizar interfaz
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
    
    // Mostrar resumen
    mostrarResumenTiempoReal(viaje);
    
    console.log('🎉 VIAJE GUARDADO EXITOSAMENTE con extras incluidos');
}

function mostrarResumenTiempoReal(viaje) {
    const diferencia = viaje.diferenciaConEstimado;
    
    // ✅ DETECTAR SI CAMBIÓ LA RENTABILIDAD
    const rentabilidadCambio = viaje.rentabilidadOriginal && 
                              viaje.rentabilidad !== viaje.rentabilidadOriginal;
    
    let mensaje = '';
    
    if (rentabilidadCambio) {
        mensaje = `🎉 ¡RENTABILIDAD MEJORÓ! De "${viaje.rentabilidadOriginal}" a "${viaje.rentabilidad}"`;
    } else if (diferencia > 5) {
        mensaje = `📈 Viaje tomó ${diferencia.toFixed(1)} min más de lo estimado`;
    } else if (diferencia < -5) {
        mensaje = `📉 Viaje tomó ${Math.abs(diferencia).toFixed(1)} min menos - ¡Más eficiente!`;
    } else {
        mensaje = '🎯 Tiempo muy cercano al estimado';
    }

    const eficienciaReal = viaje.gananciaPorMinuto;
    const eficienciaEstimada = viaje.tarifa / viaje.tiempoEstimado;

    alert(`✅ VIAJE COMPLETADO

⏱️ Tiempos:
• Estimado: ${viaje.tiempoEstimado} min
• Real: ${viaje.tiempoReal} min  
• Diferencia: ${diferencia.toFixed(1)} min

💰 Rentabilidad:
• Estimada: ${viaje.rentabilidadOriginal || 'N/A'}
• Real: ${viaje.rentabilidad} ${viaje.emoji}

📊 Eficiencia por minuto:
• Estimada: ${formatearMoneda(eficienciaEstimada)}
• Real: ${formatearMoneda(eficienciaReal)}

${mensaje}

${rentabilidadCambio ? '💡 El historial mostrará la rentabilidad REAL basada en tu tiempo' : ''}`);
}

function limpiarFormularioCompleto() {
    console.log('🧹 Limpiando formulario completo...');
    
    // Limpiar timeout de cálculo automático
    if (timeoutCalculoAutomatico) {
        clearTimeout(timeoutCalculoAutomatico);
        timeoutCalculoAutomatico = null;
    }
    
    // Limpiar campos del formulario
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    
    // Ocultar resultado rápido
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.add('hidden');
    }
    
    // Limpiar variables
    Actual = null;
    calculoActual = null;
    
    // Cerrar cualquier modal abierto
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado completamente');
}

// =============================================
// SISTEMA DE AUTO-APRENDIZAJE DE RUTAS - COMPLETO
// =============================================

class RouteLearningSystem {
    constructor() {
        this.initialized = false;
        this.learningEnabled = true;
        this.conservativeData = this.initializeConservativeData();
    }

    // Datos conservadores iniciales (funcionan SIN viajes previos)
    initializeConservativeData() {
        return {
            'MORNING_PEAK': { efficiency: 7.0, trafficFactor: 1.4, successRate: 45 },
            'EVENING_PEAK': { efficiency: 6.5, trafficFactor: 1.6, successRate: 40 },
            'MIDDAY': { efficiency: 8.5, trafficFactor: 1.2, successRate: 55 },
            'NIGHT': { efficiency: 10.0, trafficFactor: 0.9, successRate: 65 },
            'REGULAR': { efficiency: 9.0, trafficFactor: 1.1, successRate: 60 }
        };
    }

    // Generar ID único para cada ruta
    generateRouteId(startLat, startLng, endLat, endLng) {
        const roundedStartLat = startLat ? startLat.toFixed(2) : '0';
        const roundedStartLng = startLng ? startLng.toFixed(2) : '0';
        const roundedEndLat = endLat ? endLat.toFixed(2) : '0';
        const roundedEndLng = endLng ? endLng.toFixed(2) : '0';
        
        return `route_${roundedStartLat}_${roundedStartLng}_${roundedEndLat}_${roundedEndLng}`;
    }

    // Obtener slot de tiempo
    getTimeSlot(hour) {
        if (hour >= 6 && hour <= 9) return 'MORNING_PEAK';
        if (hour >= 12 && hour <= 14) return 'MIDDAY';
        if (hour >= 16 && hour <= 19) return 'EVENING_PEAK';
        if (hour >= 22 || hour <= 5) return 'NIGHT';
        return 'REGULAR';
    }

    // Analizar y aprender de cada viaje completado
    async analyzeCompletedTrip(tripData) {
        if (!this.learningEnabled || !firebaseSync) {
            console.log('⏸️ Sistema de aprendizaje desactivado');
            return;
        }

        try {
            if (!tripData.minutos || !tripData.distancia || tripData.minutos < 1) {
                console.log('⚠️ Datos insuficientes para aprendizaje');
                return;
            }

            const now = new Date();
            const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const timeSlot = this.getTimeSlot(now.getHours());
            
            let routeId;
            let locationData = {};
            
            if (tripData.locationData && tripData.locationData.startLocation) {
                const { startLocation, endLocation } = tripData.locationData;
                routeId = this.generateRouteId(
                    startLocation.lat, startLocation.lng,
                    endLocation?.lat || startLocation.lat,
                    endLocation?.lng || startLocation.lng
                );
                locationData = { startLocation, endLocation };
            } else {
                routeId = this.generateRouteId(
                    Math.random() * 0.1 + 18.4,
                    Math.random() * 0.1 - 69.9,
                    Math.random() * 0.1 + 18.4,
                    Math.random() * 0.1 - 69.9
                );
            }

            const efficiency = tripData.gananciaPorMinuto || 0;
            const trafficFactor = this.calculateTrafficFactor(tripData);
            
            const learningData = {
                routeId,
                dayOfWeek,
                timeSlot,
                originalTime: tripData.minutos,
                actualTime: tripData.minutos,
                distance: tripData.distancia,
                earnings: tripData.tarifa || tripData.ganancia,
                efficiency: parseFloat(efficiency.toFixed(2)),
                trafficFactor: parseFloat(trafficFactor.toFixed(3)),
                profitability: tripData.rentabilidad || 'unknown',
                ...locationData,
                timestamp: now.toISOString(),
                userId: userCodeSystem.userId,
                profileId: perfilActual?.id
            };

            console.log('🧠 Guardando datos de aprendizaje:', learningData);

            const success = await firebaseSync.saveRouteLearning(learningData);
            if (success) {
                console.log('✅ Aprendizaje guardado exitosamente');
            } else {
                console.log('⚠️ Aprendizaje guardado localmente');
                this.saveLearningLocal(learningData);
            }
            
        } catch (error) {
            console.error('❌ Error en análisis de aprendizaje:', error);
        }
    }

    // Obtener predicciones inteligentes (funciona SIN datos)
    async getPredictiveInsights(estimatedTime, estimatedDistance, estimatedEarnings = 0) {
        if (!this.learningEnabled) {
            return this.getConservativePrediction(estimatedTime, this.getTimeSlot(new Date().getHours()));
        }

        try {
            const now = new Date();
            const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
            const timeSlot = this.getTimeSlot(now.getHours());
            
            // Generar routeId aproximado para consulta
            const routeId = this.generateRouteId(18.4, -69.9, 18.5, -69.8);

            let historicalStats = null;
            
            // Intentar obtener datos históricos si Firebase está disponible
            if (firebaseSync && firebaseSync.initialized) {
                historicalStats = await firebaseSync.getRouteLearningStats(routeId, dayOfWeek, timeSlot);
            }

            // ✅ SISTEMA HÍBRIDO: Usa datos históricos O conservadores
            if (historicalStats && historicalStats.totalTrips >= 2) {
                
                const trafficFactor = Math.max(1.0, historicalStats.avgTrafficFactor); // ✅ Mínimo 1.0
            const adjustedTime = Math.ceil(estimatedTime * trafficFactor);
                
                // Tenemos datos reales - usar predicción inteligente
                return {
                    predictedEfficiency: historicalStats.avgEfficiency,
                    trafficFactor: historicalStats.avgTrafficFactor,
                    successRate: historicalStats.profitabilityRate,
                    confidence: Math.min(90, historicalStats.totalTrips * 15),
                    dataPoints: historicalStats.totalTrips,
                    adjustedTime: Math.ceil(estimatedTime * historicalStats.avgTrafficFactor),
                    recommendation: this.generateRecommendation(historicalStats),
                    dataSource: 'HISTORICAL',
                    message: `Basado en ${historicalStats.totalTrips} viajes similares`
                };
            } else {
                // Sin datos históricos - usar predicción conservadora
                const conservative = this.conservativeData[timeSlot] || this.conservativeData.REGULAR;
                const estimatedEfficiency = estimatedEarnings / estimatedTime;

                 const trafficFactor = Math.max(1.0, conservative.trafficFactor);
            const adjustedTime = Math.ceil(estimatedTime * trafficFactor);
                
                return {
                    predictedEfficiency: conservative.efficiency,
                    trafficFactor: conservative.trafficFactor,
                    successRate: conservative.successRate,
                    confidence: 35,
                    dataPoints: 0,
                   adjustedTime: adjustedTime,
                    recommendation: this.getConservativeRecommendation(estimatedEfficiency),
                    dataSource: 'CONSERVATIVE',
                    message: 'Predicción base - mejora con cada viaje'
                };
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo insights predictivos:', error);
            return this.getConservativePrediction(estimatedTime, this.getTimeSlot(new Date().getHours()));
        }
    }

esZonaCongestionadaRD(routeId) {
    if (!routeId) return false;
    
    // Coordenadas aproximadas de zonas típicamente congestionadas en RD
    const zonasCongestionadas = [
        '18.48', // Santo Domingo centro
        '18.49', // Naco
        '18.50', // Piantini
        '18.46', // 27 de Febrero
        '18.47'  // Churchill
    ];
    
    return zonasCongestionadas.some(zona => routeId.includes(zona));
}

    // MODIFICAR el método getConservativeEstimate (si existe) o crear uno nuevo
getConservativeEstimateRD(estimatedTime, estimatedDistance) {
    const ahora = new Date();
    const hora = ahora.getHours();
    const esHoraPicoRD = (hora >= 7 && hora <= 9) || (hora >= 17 && hora <= 19);
    
    let factorBase = 1.0;
    
    if (esHoraPicoRD) {
        // Hora pico en RD
        if (estimatedDistance <= 4) {
            factorBase = 1.15; // 15% máximo para cortos
        } else if (estimatedDistance <= 10) {
            factorBase = 1.25; // 25% para medianos
        } else {
            factorBase = 1.4; // 40% para largos
        }
    } else {
        // Fuera de hora pico
        factorBase = 1.1; // Solo 10% extra
    }
    
    return {
        predictedEfficiency: 8.0,
        trafficFactor: factorBase,
        successRate: 60,
        confidence: 40,
        dataPoints: 0,
        adjustedTime: Math.ceil(estimatedTime * factorBase),
        recommendation: 'CONSERVATIVE_RD',
        dataSource: 'CONTEXTO_RD',
        message: `Estimación para ${esHoraPicoRD ? 'hora pico RD' : 'tráfico normal'}`
    };
}
    
    // Generar recomendación basada en datos históricos
    generateRecommendation(stats) {
        if (stats.profitabilityRate >= 80) return 'HIGH_SUCCESS';
        if (stats.profitabilityRate >= 60) return 'GOOD_OPPORTUNITY'; 
        if (stats.profitabilityRate >= 40) return 'MODERATE_RISK';
        return 'HIGH_RISK';
    }

    // Generar recomendación conservadora
    getConservativeRecommendation(estimatedEfficiency) {
        const baseEfficiency = perfilActual?.umbralMinutoRentable || 6.0;
        
        if (estimatedEfficiency >= baseEfficiency * 1.3) return 'GOOD_OPPORTUNITY';
        if (estimatedEfficiency >= baseEfficiency) return 'MODERATE_RISK';
        return 'HIGH_RISK';
    }

    // Predicción conservadora de fallback
    getConservativePrediction(estimatedTime, timeSlot) {
        const conservative = this.conservativeData[timeSlot] || this.conservativeData.REGULAR;

        const trafficFactor = Math.max(1.0, conservative.trafficFactor);
    const adjustedTime = Math.ceil(estimatedTime * trafficFactor);
        
        return {
            predictedEfficiency: conservative.efficiency,
            trafficFactor: conservative.trafficFactor,
            successRate: conservative.successRate,
            confidence: 30,
            dataPoints: 0,
            adjustedTime: adjustedTime,
            recommendation: 'CONSERVATIVE_ESTIMATE',
            dataSource: 'FALLBACK',
            message: 'Usando datos base del sistema'
        };
    }

    calculateTrafficFactor(tripData) {
        const baseEfficiency = perfilActual?.umbralMinutoRentable || 6.0;
        const actualEfficiency = tripData.gananciaPorMinuto || 0;
        
        if (actualEfficiency <= 0) return 1.0;
        
        const factor = Math.max(0.5, Math.min(2.0, baseEfficiency / actualEfficiency));
        return parseFloat(factor.toFixed(3));
    }

    saveLearningLocal(learningData) {
        try {
            const localLearning = JSON.parse(localStorage.getItem('DIBER_route_learning') || '[]');
            localLearning.push({
                ...learningData,
                localSave: true,
                localTimestamp: new Date().toISOString()
            });
            
            if (localLearning.length > 50) {
                localLearning.splice(0, localLearning.length - 50);
            }
            
            localStorage.setItem('DIBER_route_learning', JSON.stringify(localLearning));
            console.log('💾 Aprendizaje guardado localmente');
        } catch (error) {
            console.error('❌ Error guardando aprendizaje local:', error);
        }
    }

    async syncLocalLearning() {
        try {
            const localLearning = JSON.parse(localStorage.getItem('DIBER_route_learning') || '[]');
            if (localLearning.length === 0) return;

            console.log('🔄 Sincronizando aprendizaje local:', localLearning.length, 'registros');

            for (const learningItem of localLearning) {
                await firebaseSync.saveRouteLearning(learningItem);
            }

            localStorage.removeItem('DIBER_route_learning');
            console.log('✅ Aprendizaje local sincronizado y limpiado');
            
        } catch (error) {
            console.error('❌ Error sincronizando aprendizaje local:', error);
        }
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

    // ✅ MÉTODO CORREGIDO - DENTRO DE LA CLASE
    async saveRouteLearning(learningData) {
        if (!this.initialized) return false;

        try {
            const learningRef = this.db.collection('route_learning')
                .doc(learningData.routeId + '_' + Date.now()); // ID único
            
            await learningRef.set({
                ...learningData,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Datos de aprendizaje guardados en Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando aprendizaje en Firebase:', error);
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

   async getRouteLearningStats(routeId, dayOfWeek, timeSlot) {
    if (!this.initialized) return null;

    try {
        console.log('🔍 Buscando datos REALES para predicción...');
        
        // CONSULTA SIMPLIFICADA que no requiere índice complejo
        const learningRef = this.db.collection('route_learning')
            .where('userId', '==', this.userId)
            .limit(20); // Solo límite, sin ordenamiento complejo

        const snapshot = await learningRef.get();
        
        if (!snapshot.empty) {
            console.log(`📊 Encontrados ${snapshot.size} viajes históricos`);
            
            // Filtrar localmente por timestamp si es necesario
            const recentTrips = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Filtrar viajes recientes (últimos 30 días)
                const tripDate = new Date(data.timestamp);
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                
                if (tripDate >= thirtyDaysAgo) {
                    recentTrips.push(data);
                }
            });

            if (recentTrips.length === 0) {
                console.log('📊 No hay viajes recientes');
                return null;
            }

            const stats = {
                totalTrips: recentTrips.length,
                avgEfficiency: 0,
                avgTrafficFactor: 0,
                profitabilityRate: 0
            };

            let totalEfficiency = 0;
            let totalTrafficFactor = 0;
            let profitableTrips = 0;

            recentTrips.forEach(data => {
                totalEfficiency += data.efficiency || 0;
                totalTrafficFactor += data.trafficFactor || 1.0;
                
                if (data.profitability === 'rentable') {
                    profitableTrips++;
                }
            });

            stats.avgEfficiency = parseFloat((totalEfficiency / recentTrips.length).toFixed(2));
            stats.avgTrafficFactor = parseFloat((totalTrafficFactor / recentTrips.length).toFixed(3));
            stats.profitabilityRate = parseFloat(((profitableTrips / recentTrips.length) * 100).toFixed(1));

            console.log('🎯 Estadísticas REALES obtenidas:', stats);
            return stats;
        }
        
        console.log('📊 No hay datos históricos del usuario');
        return null;
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        
        // Si es error de índice, usar datos conservadores
        if (error.code === 'failed-precondition') {
            console.log('📊 Usando datos conservadores por falta de índice');
            return null;
        }
        
        return null;
    }
}
    
 async startRealTimeListeners() {
        if (!this.initialized) return;
        
        try {
            console.log('👂 Iniciando escuchadores en tiempo real...');
            
            // Escuchar cambios en viajes
            this.tripsUnsubscribe = this.db.collection('users').doc(this.userId)
                .collection('trips')
                .onSnapshot(async (snapshot) => {
                    console.log('🔄 Cambios detectados en viajes de Firebase');
                    
                    snapshot.docChanges().forEach(async (change) => {
                        if (change.type === 'removed') {
                            // ✅ VIAJE ELIMINADO EN OTRO DISPOSITIVO
                            const deletedTripId = change.doc.id;
                            console.log('🗑️ Viaje eliminado en otro dispositivo:', deletedTripId);
                            
                            // Eliminar localmente
                            const index = historial.findIndex(viaje => viaje.id === deletedTripId);
                            if (index !== -1) {
                                historial.splice(index, 1);
                                localStorage.setItem('historialViajes', JSON.stringify(historial));
                                console.log('✅ Viaje eliminado localmente por sincronización');
                                
                                // Actualizar interfaz
                                actualizarHistorialConFiltros();
                                actualizarEstadisticas();
                                mostrarStatus('🔄 Historial actualizado desde la nube', 'info');
                            }
                        }
                        
                        if (change.type === 'added') {
                            // ✅ VIAJE AGREGADO EN OTRO DISPOSITIVO
                            const newTrip = change.doc.data();
                            console.log('➕ Viaje agregado en otro dispositivo:', newTrip.id);
                            
                            // Verificar si ya existe localmente
                            const exists = historial.some(viaje => viaje.id === newTrip.id);
                            if (!exists) {
                                historial.unshift(newTrip);
                                
                                // Limitar a 100 viajes
                                if (historial.length > 100) {
                                    historial = historial.slice(0, 100);
                                }
                                
                                localStorage.setItem('historialViajes', JSON.stringify(historial));
                                console.log('✅ Viaje agregado localmente por sincronización');
                                
                                // Actualizar interfaz
                                actualizarHistorialConFiltros();
                                actualizarEstadisticas();
                                mostrarStatus('🔄 Nuevo viaje sincronizado', 'info');
                            }
                        }
                    });
                }, (error) => {
                    console.error('❌ Error en escuchador de viajes:', error);
                });

            console.log('✅ Escuchadores en tiempo real activados');
            
        } catch (error) {
            console.error('❌ Error iniciando escuchadores:', error);
        }
    }

    stopRealTimeListeners() {
        if (this.tripsUnsubscribe) {
            this.tripsUnsubscribe();
            console.log('🔇 Escuchadores detenidos');
        }
    }
}
// =============================================
// LIMPIAR DATOS MULTI-DISPOSITIVO - CORREGIDO
// =============================================

async function limpiarDatosMultiDispositivo() {
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('Firebase no disponible para limpieza multi-dispositivo');
        return;
    }
    
    if (confirm('¿Estás seguro? Esto eliminará TODOS tus viajes en TODOS los dispositivos. Esta acción no se puede deshacer.')) {
        try {
            mostrarStatus('🔄 Limpiando datos en todos los dispositivos...', 'info');
            
            // Limpiar localmente primero
            historial = [];
            localStorage.setItem('historialViajes', JSON.stringify(historial));
            
            // Limpiar en Firebase
            const tripsRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                .collection('trips');
            
            const snapshot = await tripsRef.get();
            const batch = firebaseSync.db.batch();
            
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            
            // Limpiar datos de aprendizaje
            const learningRef = firebaseSync.db.collection('route_learning')
                .where('userId', '==', userCodeSystem.userId);
                
            const learningSnapshot = await learningRef.get();
            const learningBatch = firebaseSync.db.batch();
            
            learningSnapshot.forEach(doc => {
                learningBatch.delete(doc.ref);
            });
            
            await learningBatch.commit();
            
            console.log('✅ Datos limpiados en todos los dispositivos');
            mostrarStatus('✅ Datos limpiados en todos los dispositivos', 'success');
            
            actualizarHistorialConFiltros();
            actualizarEstadisticas();
            
        } catch (error) {
            console.error('❌ Error limpiando datos multi-dispositivo:', error);
            mostrarError('Error limpiando datos en la nube');
        }
    }
}

// =============================================
// INICIALIZACIÓN DE ELEMENTOS DOM - CORREGIDA
// =============================================

function inicializarElementosDOM() {
    console.log('🔍 Inicializando elementos DOM...');
    
    const ids = [
        'perfil-screen', 'config-perfil-screen', 'main-screen',
        'status-indicator', 'status-text',
        'tarifa', 'minutos', 'distancia',
        'resultado-rapido', 'resultado-badge', 'resultado-emoji', 'resultado-texto',
        'metrica-minuto', 'metrica-km',
        'aceptar-viaje', 'rechazar-viaje',
        'modalFondo', 'modalContenido', 'modalResultadosDoble', 'modal-badge', 'modal-emoji', 'modal-texto',
        'history-list', 'clear-history', 'exportar-historial',
        'stats-viajes', 'stats-ganancia', 'stats-tiempo', 'stats-rentables',
        'perfiles-lista', 'nuevo-perfil-btn', 'perfil-form', 'volver-perfiles', 'cancelar-perfil', 'cambiar-perfil',
        'theme-toggle', 'exportModal', 'exportar-pdf', 'sync-panel',
        'sync-status-btn', 'sync-btn-icon',
        'rendimiento-ganancia-hora-linea', 'rendimiento-viaje-promedio-linea',
        'rendimiento-ganancia-hora-card', 'rendimiento-distancia-total-card',
        'rendimiento-eficiencia-card', 'rendimiento-eficiencia-badge',
        'user-code-modal', 'user-code-input',
        'activar-ubicacion-btn', 'location-status',
        'modal-rapido', 'modal-trafico-header', 'modal-trafico-status', 'modal-trafico-condition',
        'modal-tiempo-original', 'modal-tiempo-real', 'modal-resultado-principal',
        'modal-badge-rentabilidad', 'modal-badge-subtitle', 'modal-ganancia-minuto',
        'modal-ganancia-km', 'modal-eficiencia', 'modal-impacto-trafico', 'modal-impacto-content',
        'modal-badge-rechazar', 'modal-badge-aceptar', 'modal-btn-aceptar',
        'code-status', 'sync-perfil-info', 'sync-panel-status', 'current-device-icon',
        'current-device-name', 'current-device-id', 'firebase-status', 'last-sync-time',
        'cloud-profiles-count', 'cloud-history-count', 'force-sync-btn'
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
        if (!elementos[id]) {
            console.warn(`⚠️ Elemento no encontrado: ${id}`);
        }
    });

    elementos.tabButtons = document.querySelectorAll('.tab-button');
    elementos.tabContents = document.querySelectorAll('.tab-content');
    
    console.log('✅ Elementos DOM inicializados correctamente');
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO - CORREGIDO
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
    showUserCodeBanner(); // Ahora se integra en el header
    
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
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function hideUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function showUserCodeBanner() {
    const headerLeft = document.querySelector('.header-left');
    if (!headerLeft) {
        console.error('❌ No se encontró header-left');
        return;
    }
    
    let codeButton = document.getElementById('user-code-button');
    
    // Si el botón no existe, crearlo
    if (!codeButton) {
        codeButton = document.createElement('button');
        codeButton.id = 'user-code-button';
        codeButton.className = 'secondary-button small user-code-button';
        codeButton.title = 'Código de sincronización: ' + (userCodeSystem.userCode || '');
        codeButton.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px 10px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 1.1em;
            width: 40px;
            height: 40px;
            transition: all 0.3s;
        `;
        
        // Insertar en header-left
        headerLeft.appendChild(codeButton);
        
        console.log('✅ Botón de código creado en header-left');
        elementos['user-code-button'] = codeButton;
    }
    
    if (userCodeSystem.userCode) {
        // SOLO EMOJI - sin código de texto
        codeButton.innerHTML = `<span class="button-icon">🔑</span>`;
        codeButton.title = 'Código de sincronización: ' + userCodeSystem.userCode;
        
        codeButton.style.display = 'flex';
        codeButton.onclick = mostrarInfoUserCode;
        
        console.log('✅ Botón de código actualizado (solo emoji)');
    }
}

function hideUserCodeBanner() {
    const codeButton = document.getElementById('user-code-button');
    if (codeButton) {
        codeButton.style.display = 'none';
    }
}

function mostrarInfoUserCode() {
    if (userCodeSystem.userCode) {
        mostrarStatus(`🔑 Código: ${userCodeSystem.userCode} - Haz clic para cambiar`, 'info');
        
        // Mostrar opción para cambiar después de 2 segundos
        setTimeout(() => {
            if (confirm(`Tu código actual es: ${userCodeSystem.userCode}\n\n¿Quieres cambiar de código?`)) {
                cambiarUsuario();
            }
        }, 2000);
    }
}

function cambiarUsuario() {
    if (confirm('¿Estás seguro de que quieres cambiar de usuario?\n\nEsto cerrará tu sesión actual.')) {
        localStorage.removeItem('DIBER_user_code');
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        hideUserCodeBanner();
        showUserCodeModal();
        
        mostrarStatus('🔑 Sesión cerrada. Ingresa un nuevo código.', 'info');
    }
}

// =============================================
// FUNCIONES PRINCIPALES - CORREGIDAS
// =============================================

async function initializeFirebaseSync() {
    console.log('🔄 Inicializando Firebase Sync...');
    
    if (firebaseInitialized && firebaseSync && firebaseSync.initialized) {
        console.log('✅ Firebase Sync ya estaba inicializado');
        return true;
    }
    
    firebaseSync = new FirebaseSync();
    const success = await firebaseSync.initialize();
    
    if (success) {
        console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
        firebaseInitialized = true;
        
        // ✅ INICIAR ESCUCHADORES EN TIEMPO REAL
        setTimeout(() => {
            firebaseSync.startRealTimeListeners();
        }, 2000);
        
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
    if (loadingData) {
        console.log('⏳ Carga de datos en progreso, omitiendo...');
        return;
    }
    
    loadingData = true;
    console.log('🔄 Cargando datos...');
    
    try {
        // Cargar de localStorage primero
        try {
            const historialGuardado = localStorage.getItem('historialViajes');
            if (historialGuardado) {
                historial = JSON.parse(historialGuardado);
                console.log('💾 Historial local cargado:', historial.length, 'viajes');
            }
            
            const datosGuardados = localStorage.getItem('DIBER_data');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                perfiles = datos.perfiles || [];
                perfilActual = datos.perfilActual || null;
                console.log('💾 Datos generales cargados LOCALMENTE');
            }
        } catch (error) {
            console.error('Error cargando datos locales:', error);
            perfiles = [];
            historial = [];
        }

        // ✅ CARGA MEJORADA DE FIREBASE - Siempre sincronizar
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Sincronizando con Firebase...');
                
                // Cargar perfiles de Firebase
                const cloudProfiles = await firebaseSync.loadProfiles();
                if (cloudProfiles && cloudProfiles.length > 0) {
                    console.log('✅ Perfiles de Firebase cargados:', cloudProfiles.length);
                    
                    // Combinar perfiles locales y en la nube
                    const perfilesUnicos = [...perfiles];
                    cloudProfiles.forEach(cloudProfile => {
                        const exists = perfilesUnicos.some(localProfile => localProfile.id === cloudProfile.id);
                        if (!exists) {
                            perfilesUnicos.push(cloudProfile);
                        }
                    });
                    perfiles = perfilesUnicos;
                }
                
                // Cargar historial de Firebase
                const cloudTrips = await firebaseSync.loadTrips();
                if (cloudTrips && cloudTrips.length > 0) {
                    console.log('✅ Viajes de Firebase cargados:', cloudTrips.length);
                    
                    // Combinar historial
                    const historialCombinado = [...historial];
                    cloudTrips.forEach(cloudTrip => {
                        const exists = historialCombinado.some(localTrip => localTrip.id === cloudTrip.id);
                        if (!exists) {
                            historialCombinado.push(cloudTrip);
                        }
                    });
                    
                    // Ordenar por fecha y limitar
                    historial = historialCombinado
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 100);
                    
                    console.log('🔄 Historial combinado:', historial.length, 'viajes');
                    
                    // Guardar localmente
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

async function guardarDatos() {
    console.log('💾 Guardando datos...');
    
    // Guardar localmente primero
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    localStorage.setItem('DIBER_data', JSON.stringify({
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));

    console.log('✅ Datos guardados localmente');
    
    // ✅ SINCRONIZACIÓN MEJORADA - Forzar sync inmediata
    if (firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Sincronizando PERFILES con Firebase...');
            for (const perfil of perfiles) {
                await firebaseSync.saveProfile(perfil);
            }
            
            console.log('☁️ Sincronizando HISTORIAL con Firebase...');
            const viajesParaSincronizar = historial.filter(item => item.aceptado).slice(0, 50);
            for (const viaje of viajesParaSincronizar) {
                await firebaseSync.saveTrip(viaje);
            }
            
            console.log('✅ Sincronización completada:', {
                perfiles: perfiles.length,
                viajes: viajesParaSincronizar.length
            });
            
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
        }
    }
}

async function forzarSincronizacionCompleta() {
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('Firebase no está disponible');
        return;
    }
    
    console.log('🔄 INICIANDO SINCRONIZACIÓN COMPLETA BIDIRECCIONAL...');
    mostrarStatus('🔄 Sincronizando todos los datos...', 'info');
    
    try {
        // ✅ 1. SUBIR DATOS LOCALES
        console.log('📤 Subiendo perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        
        console.log('📤 Subiendo viajes locales...');
        const viajesLocales = historial.filter(item => item.aceptado !== false);
        let viajesSubidos = 0;
        
        for (const viaje of viajesLocales) {
            const exito = await firebaseSync.saveTrip(viaje);
            if (exito) viajesSubidos++;
        }
        
        // ✅ 2. DESCARGAR DATOS DE FIREBASE
        console.log('📥 Descargando viajes de Firebase...');
        const cloudTrips = await firebaseSync.loadTrips();
        if (cloudTrips && cloudTrips.length > 0) {
            let viajesDescargados = 0;
            
            cloudTrips.forEach(cloudTrip => {
                const exists = historial.some(localTrip => localTrip.id === cloudTrip.id);
                if (!exists) {
                    historial.unshift(cloudTrip);
                    viajesDescargados++;
                }
            });
            
            // Ordenar y limitar
            historial = historial
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 100);
            
            localStorage.setItem('historialViajes', JSON.stringify(historial));
            console.log(`✅ ${viajesDescargados} viajes descargados de Firebase`);
        }
        
        console.log('✅ Sincronización bidireccional completada');
        mostrarStatus(`✅ Sincronizado: ${viajesSubidos} subidos, ${historial.length} en total`, 'success');
        
        // Actualizar interfaz
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
    } catch (error) {
        console.error('❌ Error en sincronización completa:', error);
        mostrarStatus('❌ Error en sincronización', 'error');
    }
}

// =============================================
// SISTEMA DE HISTORIAL
// =============================================

historial = JSON.parse(localStorage.getItem('historialViajes')) || [];

async function agregarAlHistorial(viaje) {
    console.log('➕ agregarAlHistorial() llamado con:', { 
        aceptado: viaje.aceptado, 
        rentabilidad: viaje.rentabilidad 
    });
    
    if (!viaje || (!viaje.tarifa && !viaje.ganancia)) {
        console.error('❌ Error: Viaje sin datos esenciales');
        return;
    }

    // ✅ SI EL VIAJE FUE RECHAZADO, MARCAR COMO NO RENTABLE
    let rentabilidad, emoji, texto;
    
    if (viaje.aceptado === false) {
        // VIAJE RECHAZADO - siempre es "no rentable"
        rentabilidad = 'rechazado';
        emoji = '🚫';
        texto = 'RECHAZADO';
    } else if (viaje.rentabilidad) {
        // VIAJE ACEPTADO - usar la rentabilidad calculada
        rentabilidad = viaje.rentabilidad;
        emoji = viaje.emoji;
        texto = viaje.texto;
    } else if (perfilActual) {
        // CALCULAR RENTABILIDAD si no está definida
        const tarifa = viaje.tarifa || viaje.ganancia || 0;
        const minutos = viaje.minutos || 0;
        const distancia = viaje.distancia || 0;
        const porMinuto = minutos > 0 ? (tarifa / minutos) : 0;
        const porKm = distancia > 0 ? (tarifa / distancia) : 0;
        
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
        ganancia: viaje.tarifa || viaje.ganancia || 0,
        tarifa: viaje.tarifa || viaje.ganancia || 0,
        minutos: viaje.minutos || 0,
        distancia: viaje.distancia || 0,
        porMinuto: parseFloat((viaje.gananciaPorMinuto || 0).toFixed(2)),
        porKm: parseFloat((viaje.gananciaPorKm || 0).toFixed(2)),
        rentable: rentabilidad === 'rentable', // ✅ Basado en cálculo correcto
        rentabilidad: rentabilidad,
        emoji: emoji,
        texto: texto,
        aceptado: viaje.aceptado !== undefined ? viaje.aceptado : true, // ✅ Respetar el valor
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
    
    console.log('📝 Viaje procesado para historial:', {
        aceptado: nuevoViaje.aceptado,
        rentabilidad: nuevoViaje.rentabilidad,
        texto: nuevoViaje.texto
    });

    historial.unshift(nuevoViaje);
    
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    // ✅ SOLO SINCRONIZAR Y APRENDER DE VIAJES ACEPTADOS
    if (nuevoViaje.aceptado !== false) {
        guardarDatos();
        
        if (firebaseSync && firebaseSync.initialized && nuevoViaje.aceptado) {
            try {
                console.log('☁️ Sincronizando viaje ACEPTADO con Firebase...');
                await firebaseSync.saveTrip(nuevoViaje);
                console.log('✅ Viaje aceptado sincronizado con Firebase');
            } catch (error) {
                console.error('❌ Error sincronizando con Firebase:', error);
            }
        }

        // ✅ SOLO APRENDER DE VIAJES ACEPTADOS
        if (window.routeLearningSystem && window.routeLearningSystem.learningEnabled) {
            setTimeout(async () => {
                console.log('🧠 Aprendiendo de viaje ACEPTADO...');
                await window.routeLearningSystem.analyzeCompletedTrip(nuevoViaje);
            }, 1500);
        }
    } else {
        console.log('🚫 Viaje rechazado - no se sincroniza ni aprende');
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
        // ✅ CORREGIDO: Solo 1 decimal en minutos
        const minutos = viaje.minutos ? parseFloat(viaje.minutos).toFixed(1) : '0.0';
        const distancia = viaje.distancia || 0;
        const porMinuto = viaje.porMinuto || viaje.gananciaPorMinuto || 0;
        const porKm = viaje.porKm || viaje.gananciaPorKm || 0;
        const esAceptado = viaje.aceptado !== false;
const esRentable = esAceptado ? (viaje.rentable !== undefined ? 
         Boolean(viaje.rentable) : 
         (viaje.rentabilidad === 'rentable')) : false;
        const fecha = viaje.fecha || 'Fecha desconocida';
        
        return `
<div class="history-item ${esAceptado ? (esRentable ? 'rentable' : 'no-rentable') : 'rechazado'}">
    <div class="history-header">
        <span class="history-badge ${esAceptado ? (esRentable ? 'badge-rentable' : 'badge-no-rentable') : 'badge-rechazado'}">
            ${viaje.emoji} ${viaje.texto}
        </span>
        <span class="history-date">${fecha}</span>
    </div>
    ${esAceptado ? `
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
    ` : `
    <div class="history-details">
        <div class="history-route">
            <em>Viaje rechazado - Sin ganancia</em>
        </div>
    </div>
    `}
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

async function eliminarDelHistorial(viajeId) {
    console.log('🗑️ Intentando eliminar viaje con ID:', viajeId);
    
    const index = historial.findIndex(viaje => viaje.id === viajeId);
    
    if (index === -1) {
        console.error('❌ Viaje no encontrado con ID:', viajeId);
        mostrarError('No se pudo encontrar el viaje para eliminar');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este viaje del historial?')) {
        // Guardar referencia al viaje antes de eliminarlo
        const viajeEliminado = historial[index];
        
        // Eliminar localmente
        historial.splice(index, 1);
        
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Viaje eliminado correctamente. Nuevo total:', historial.length);
        
        // ✅ SINCRONIZAR ELIMINACIÓN CON FIREBASE INMEDIATAMENTE
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Sincronizando eliminación con Firebase...');
                
                // 1. Eliminar de la colección de trips
                const tripRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips').doc(viajeId);
                await tripRef.delete();
                
                // 2. También eliminar de route_learning si existe
                const learningQuery = await firebaseSync.db.collection('route_learning')
                    .where('userId', '==', userCodeSystem.userId)
                    .where('relatedTripId', '==', viajeId)
                    .get();
                
                if (!learningQuery.empty) {
                    const batch = firebaseSync.db.batch();
                    learningQuery.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log('✅ Datos de aprendizaje eliminados de Firebase');
                }
                
                console.log('✅ Eliminación sincronizada con todos los dispositivos');
                mostrarStatus('✅ Viaje eliminado y sincronizado', 'success');
                
            } catch (error) {
                console.error('❌ Error sincronizando eliminación:', error);
                mostrarStatus('✅ Viaje eliminado localmente', 'success');
            }
        } else {
            mostrarStatus('✅ Viaje eliminado localmente', 'success');
        }
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
    }
}

async function limpiarHistorialCompleto() {
    console.log('🗑️ Solicitando limpiar historial completo...');
    
    if (historial.length === 0) {
        mostrarMensaje('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres limpiar TODO el historial?\n\nSe eliminarán ${historial.length} viajes.\n\n⚠️ Esta acción NO se puede deshacer.`)) {
        historial = [];
        
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Historial completo limpiado');
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        
        mostrarMensaje(`✅ Historial limpiado correctamente (${historial.length} viajes)`, 'success');
        
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando limpiar Firebase...');
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

// Agregar después de tu código existente de pestañas
function updateTabIndicator(activeIndex) {
    const tabsHeader = document.querySelector('.tabs-header');
    if (tabsHeader) {
        tabsHeader.setAttribute('data-active-tab', activeIndex);
    }
}

// =============================================
// NUEVO: CALCULAR COSTOS REALES DESDE PERFIL
// =============================================
function calcularCostosDesdePerfil(distanciaKm, minutosReales) {
    if (!perfilActual) {
        console.error('❌ No hay perfil para calcular costos');
        return null;
    }
    
    console.log('📊 Calculando costos desde perfil:', perfilActual.nombre);
    
    // 1. COMBUSTIBLE (ya lo calculas en calcularRentabilidad)
    const combustibleUsado = distanciaKm / perfilActual.rendimiento;
    const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
    
    // 2. MANTENIMIENTO (tú ya tienes costoMantenimiento ANUAL en el perfil)
    const costoMantenimientoAnual = perfilActual.costoMantenimiento || 0;
    // Convertir anual a por km: asumimos 20,000 km/año
    const costoMantenimientoPorKm = costoMantenimientoAnual / 20000;
    const costoMantenimientoViaje = distanciaKm * costoMantenimientoPorKm;
    
    // 3. SEGURO (tú ya tienes costoSeguro MENSUAL en el perfil)
    const costoSeguroMensual = perfilActual.costoSeguro || 0;
    // Convertir mensual a por minuto: 30 días × 24 horas × 60 minutos
    const minutosEnUnMes = 30 * 24 * 60;
    const costoSeguroPorMinuto = costoSeguroMensual / minutosEnUnMes;
    const costoSeguroViaje = minutosReales * costoSeguroPorMinuto;
    
    // 4. DEPRECIACIÓN (aproximación: 1% del valor del auto por cada 1,000 km)
    const depreciacionPorKm = 0.01; // 1% cada 1000 km = 0.01% por km
    
    const costos = {
        // Costos variables
        combustible: parseFloat(costoCombustible.toFixed(2)),
        mantenimiento: parseFloat(costoMantenimientoViaje.toFixed(2)),
        depreciacion: parseFloat((distanciaKm * depreciacionPorKm).toFixed(2)),
        
        // Costos fijos (proporcionales al tiempo)
        seguro: parseFloat(costoSeguroViaje.toFixed(2)),
        
        // Totales
        costoVariable: parseFloat((costoCombustible + costoMantenimientoViaje + (distanciaKm * depreciacionPorKm)).toFixed(2)),
        costoFijo: parseFloat(costoSeguroViaje.toFixed(2)),
        costoTotal: 0, // Se calcula abajo
        costoPorKm: 0  // Se calcula abajo
    };
    
    // Calcular totales
    costos.costoTotal = costos.costoVariable + costos.costoFijo;
    
    if (distanciaKm > 0) {
        costos.costoPorKm = parseFloat((costos.costoTotal / distanciaKm).toFixed(2));
    }
    
    console.log('📈 Costos calculados desde perfil:', {
        perfil: perfilActual.nombre,
        rendimiento: perfilActual.rendimiento,
        precioCombustible: perfilActual.precioCombustible,
        costoCombustible: costos.combustible,
        costoMantenimiento: costos.mantenimiento,
        costoSeguro: costos.seguro,
        costoTotal: costos.costoTotal
    });
    
    return costos;
}

// =============================================
// NUEVO: CALCULAR GANANCIA NETA REAL DESDE PERFIL
// =============================================
function calcularGananciaNetaRealDesdePerfil(tarifaBruta, distanciaKm, minutosReales) {
    if (!perfilActual) {
        console.error('❌ No hay perfil activo');
        return null;
    }
    
    // 1. Calcular costos usando el perfil actual
    const costos = calcularCostosDesdePerfil(distanciaKm, minutosReales);
    if (!costos) return null;
    
    // 2. Ganancia neta
    const gananciaNeta = tarifaBruta - costos.costoTotal;
    
    // 3. Neto por minuto (LA MÉTRICA CLAVE)
    const netoPorMinuto = minutosReales > 0 ? gananciaNeta / minutosReales : 0;
    
    return {
        // Datos del viaje
        tarifaBruta: tarifaBruta,
        distanciaKm: distanciaKm,
        minutosReales: minutosReales,
        
        // Costos detallados
        costos: costos,
        
        // Resultados financieros
        gananciaNeta: parseFloat(gananciaNeta.toFixed(2)),
        netoPorMinuto: parseFloat(netoPorMinuto.toFixed(2)),
        
        // Rentabilidad según neto (nueva clasificación)
        rentabilidadReal: clasificarRentabilidadPorNeto(netoPorMinuto),
        
        // Comparación con umbrales del perfil
        comparacionConPerfil: compararConUmbralesPerfil(netoPorMinuto)
    };
}

// =============================================
// NUEVO: CLASIFICAR POR NETO (USA TUS UMBRALES COMO BASE)
// =============================================
function clasificarRentabilidadPorNeto(netoPorMinuto) {
    // Usamos tus umbrales del perfil como referencia
    const umbralMinuto = perfilActual?.umbralMinutoRentable || 6.0;
    const umbralOportunidad = perfilActual?.umbralMinutoOportunidad || 5.0;
    
    // Ajustamos para neto (neto suele ser ~70-80% del bruto)
    const ajusteNeto = 0.75; // 75% del bruto es neto aproximado
    
    const umbralNetoRentable = umbralMinuto * ajusteNeto;
    const umbralNetoOportunidad = umbralOportunidad * ajusteNeto;
    
    console.log('🎯 Umbrales para neto:', {
        brutoRentable: umbralMinuto,
        brutoOportunidad: umbralOportunidad,
        netoRentable: umbralNetoRentable,
        netoOportunidad: umbralNetoOportunidad,
        netoActual: netoPorMinuto
    });
    
    if (netoPorMinuto < 0) {
        return {
            categoria: 'perdida',
            emoji: '💀',
            texto: 'PÉRDIDA',
            color: 'c62828',
            descripcion: 'Estás perdiendo dinero en este viaje',
            nivel: 0
        };
    } else if (netoPorMinuto < umbralNetoOportunidad) {
        return {
            categoria: 'sobrevive',
            emoji: '🟡',
            texto: 'SOBREVIVE',
            color: 'ff9800',
            descripcion: 'Solo cubre costos básicos',
            nivel: 1
        };
    } else if (netoPorMinuto < umbralNetoRentable) {
        return {
            categoria: 'oportunidad',
            emoji: '⚠️',
            texto: 'OPORTUNIDAD',
            color: 'ffb300',
            descripcion: 'Cerca de ser rentable real',
            nivel: 2
        };
    } else if (netoPorMinuto < umbralNetoRentable * 1.3) {
        return {
            categoria: 'rentable',
            emoji: '✅',
            texto: 'RENTABLE REAL',
            color: '2e7d32',
            descripcion: 'Ganancia real después de todos los costos',
            nivel: 3
        };
    } else {
        return {
            categoria: 'excelente',
            emoji: '🔥',
            texto: 'EXCELENTE',
            color: '1565c0',
            descripcion: 'Excelente ganancia neta',
            nivel: 4
        };
    }
}

// =============================================
// NUEVO: COMPARAR CON TUS UMBRALES DEL PERFIL
// =============================================
function compararConUmbralesPerfil(netoPorMinuto) {
    if (!perfilActual) return null;
    
    const brutoNecesarioRentable = perfilActual.umbralMinutoRentable || 6.0;
    const brutoNecesarioOportunidad = perfilActual.umbralMinutoOportunidad || 5.0;
    
    // Estimación: neto es aproximadamente 75% del bruto
    const conversionBrutoANeto = 0.75;
    
    const netoEquivalenteRentable = brutoNecesarioRentable * conversionBrutoANeto;
    const netoEquivalenteOportunidad = brutoNecesarioOportunidad * conversionBrutoANeto;
    
    return {
        // Lo que TU configuraste como rentable en bruto
        tuUmbralRentableBruto: brutoNecesarioRentable,
        tuUmbralOportunidadBruto: brutoNecesarioOportunidad,
        
        // Equivalente en neto
        equivalenteRentableNeto: parseFloat(netoEquivalenteRentable.toFixed(2)),
        equivalenteOportunidadNeto: parseFloat(netoEquivalenteOportunidad.toFixed(2)),
        
        // Cómo está este viaje comparado
        vsRentable: parseFloat((netoPorMinuto - netoEquivalenteRentable).toFixed(2)),
        vsOportunidad: parseFloat((netoPorMinuto - netoEquivalenteOportunidad).toFixed(2)),
        
        // Porcentaje de logro
        porcentajeRentable: parseFloat(((netoPorMinuto / netoEquivalenteRentable) * 100).toFixed(1)),
        porcentajeOportunidad: parseFloat(((netoPorMinuto / netoEquivalenteOportunidad) * 100).toFixed(1))
    };
}

// =============================================
// CÁLCULO NETO INSTANTÁNEO PARA DECISIÓN
// =============================================

function calcularRentabilidadNetaInstantanea(tarifa, minutos, distancia) {
    if (!perfilActual) return null;
    
    // 1. Calcular costos REALES
    const costos = calcularCostosDesdePerfil(distancia, minutos);
    if (!costos) return null;
    
    // 2. Ganancia neta
    const gananciaNeta = tarifa - costos.costoTotal;
    const netoPorMinuto = minutos > 0 ? gananciaNeta / minutos : 0;
    
    // 3. Clasificación neta (OBLIGATORIA según requerimiento)
    let clasificacionNeta, colorNeta;
    if (netoPorMinuto >= 8) {
        clasificacionNeta = 'EXCELENTE';
        colorNeta = '#2563EB';
    } else if (netoPorMinuto >= 6) {
        clasificacionNeta = 'RENTABLE';
        colorNeta = '#10B981';
    } else if (netoPorMinuto >= 4) {
        clasificacionNeta = 'OPORTUNIDAD';
        colorNeta = '#F59E0B';
    } else {
        clasificacionNeta = 'BAJO';
        colorNeta = '#EF4444';
    }
    
    return {
        gananciaNeta: parseFloat(gananciaNeta.toFixed(2)),
        netoPorMinuto: parseFloat(netoPorMinuto.toFixed(2)),
        clasificacionNeta,
        colorNeta,
        costosTotales: costos.costoTotal,
        porcentajeNeto: parseFloat(((gananciaNeta / tarifa) * 100).toFixed(1))
    };
}

// =============================================
// IMPACTO EN META 32K (SOLO INFORMATIVO)
// =============================================

function calcularImpactoEnMeta32k(netoPorMinuto) {
    if (!netoPorMinuto || netoPorMinuto <= 0) return null;
    
    // Meta: 32,000 RD$ en 22 días × 8 horas = 176 horas = 10,560 minutos
    const ritmoNecesarioNeto = 32000 / 10560; // ≈ 3.03 RD$/min NETO
    
    const diferencia = netoPorMinuto - ritmoNecesarioNeto;
    
    // Solo informativo, nunca decisorio
    let impacto, icono, color;
    
    if (netoPorMinuto >= ritmoNecesarioNeto * 1.5) {
        impacto = 'ALTO impacto positivo';
        icono = '🚀';
        color = '#10B981';
    } else if (netoPorMinuto >= ritmoNecesarioNeto) {
        impacto = 'Contribuye a la meta';
        icono = '📈';
        color = '#3B82F6';
    } else if (netoPorMinuto >= ritmoNecesarioNeto * 0.7) {
        impacto = 'Impacto moderado';
        icono = '⚖️';
        color = '#F59E0B';
    } else {
        impacto = 'Impacto bajo (pero aceptable)';
        icono = '📉';
        color = '#6B7280';
    }
    
    return {
        impacto,
        icono,
        color,
        ritmoNecesario: ritmoNecesarioNeto.toFixed(2),
        ritmoViaje: netoPorMinuto.toFixed(2),
        diferencia: diferencia.toFixed(2),
        esAceptable: true // Siempre true, es solo informativo
    };
}

// =============================================
// NUEVO: CALCULAR META CON TUS HORAS DE TRABAJO
// =============================================
function calcularMetaPersonalizada() {
    if (!perfilActual) {
        console.log('⚠️ Sin perfil, usando valores por defecto');
        return {
            metaMensual: 32000,
            horasPorDia: 8,
            diasPorMes: 22,
            ritmoPorMinuto: 3.03 // 32k ÷ (22×8×60)
        };
    }
    
    // Aquí puedes añadir campos al perfil para meta personalizada
    // Por ahora usamos 32k como default
    const metaMensual = 32000;
    const horasPorDia = 8; // Podrías añadir este campo al perfil
    const diasPorMes = 22; // Podrías añadir este campo al perfil
    
    const minutosPorMes = diasPorMes * horasPorDia * 60;
    const ritmoPorMinuto = metaMensual / minutosPorMes;
    
    return {
        metaMensual: metaMensual,
        metaDiaria: parseFloat((metaMensual / diasPorMes).toFixed(2)),
        horasPorDia: horasPorDia,
        diasPorMes: diasPorMes,
        minutosPorMes: minutosPorMes,
        ritmoPorMinuto: parseFloat(ritmoPorMinuto.toFixed(2)),
        ritmoPorHora: parseFloat((metaMensual / (diasPorMes * horasPorDia)).toFixed(2))
    };
}

// =============================================
// NUEVO: CALCULAR IMPACTO EN META (CON TUS DATOS)
// =============================================
function calcularImpactoEnMeta(netoPorMinuto) {
    const meta = calcularMetaPersonalizada();
    const diferencia = netoPorMinuto - meta.ritmoPorMinuto;
    
    // Tu umbral de rentabilidad como referencia
    const umbralRentable = perfilActual?.umbralMinutoRentable || 6.0;
    const conversionNeto = 0.75; // 75% del bruto es neto
    const tuUmbralNeto = umbralRentable * conversionNeto;
    
    if (netoPorMinuto >= tuUmbralNeto * 1.2) {
        return {
            impacto: 'supera-meta',
            emoji: '🚀',
            texto: 'SUPERA META Y UMBRAL',
            mensaje: `Este viaje (RD$${netoPorMinuto.toFixed(2)}/min neto) supera tu meta y tu umbral de RD$${tuUmbralNeto.toFixed(2)}/min`,
            diferencia: diferencia.toFixed(2),
            color: 'blue'
        };
    } else if (netoPorMinuto >= meta.ritmoPorMinuto) {
        return {
            impacto: 'alcanza-meta',
            emoji: '🎯',
            texto: 'ALCANZA META',
            mensaje: `Este viaje (RD$${netoPorMinuto.toFixed(2)}/min neto) alcanza tu meta de RD$${meta.ritmoPorMinuto}/min`,
            diferencia: diferencia.toFixed(2),
            color: 'green'
        };
    } else if (netoPorMinuto >= tuUmbralNeto) {
        return {
            impacto: 'rentable-pero-no-meta',
            emoji: '✅',
            texto: 'RENTABLE PERO NO META',
            mensaje: `Es rentable (RD$${netoPorMinuto.toFixed(2)}/min) pero no alcanza la meta de RD$${meta.ritmoPorMinuto}/min`,
            diferencia: diferencia.toFixed(2),
            color: 'orange'
        };
    } else {
        return {
            impacto: 'frena-meta',
            emoji: '🐌',
            texto: 'FRENA META',
            mensaje: `Este viaje (RD$${netoPorMinuto.toFixed(2)}/min neto) frena tu camino a la meta`,
            diferencia: Math.abs(diferencia).toFixed(2),
            color: 'red'
        };
    }
}

// =============================================
// SISTEMA DE CÁLCULO - CORREGIDO
// =============================================

// Variable para el timeout del cálculo automático
let timeoutCalculoAutomatico = null;

function manejarCalculoAutomatico() {
    if (timeoutCalculoAutomatico) {
        clearTimeout(timeoutCalculoAutomatico);
    }
    
    timeoutCalculoAutomatico = setTimeout(calcularAutomaticoConTraficoReal, 500);
}

async function calcularAutomaticoConTraficoReal() {
    if (!elementos.tarifa || !elementos.minutos || !elementos.distancia) return;
    
    const tarifa = parseFloat(elementos.tarifa.value) || 0;
    const minutos = parseFloat(elementos.minutos.value) || 0;
    const distancia = parseFloat(elementos.distancia.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        console.log('🔄 Cálculo automático CON ANÁLISIS NETO...');
        
        let trafficInsights = null;
        
        // OBTENER ANÁLISIS DE TRÁFICO EN TIEMPO REAL
        if (realTimeTraffic && realTimeTraffic.initialized) {
            try {
                trafficInsights = await realTimeTraffic.analyzeTrafficInRadius();
                console.log('📊 Insights de tráfico:', trafficInsights);
            } catch (error) {
                console.log('🔄 Usando estimación conservadora');
                trafficInsights = realTimeTraffic.getConservativeEstimate();
            }
        }
        
        let tiempoFinal = minutos;
        let fuenteDatos = 'BASE';
        
        if (trafficInsights) {
            tiempoFinal = trafficInsights.adjustedTime;
            fuenteDatos = 'TRÁFICO REAL';
        }
        
        // ✅ 1. CALCULAR RENTABILIDAD ORIGINAL
        const resultado = calcularRentabilidad(tarifa, tiempoFinal, distancia);
        
        if (resultado) {
            // ✅ 2. CALCULAR ANÁLISIS NETO (OBLIGATORIO)
            const analisisNeto = calcularRentabilidadNetaInstantanea(
                tarifa, 
                tiempoFinal,
                distancia
            );
            
            // ✅ 3. INTEGRAR ANÁLISIS NETO EN RESULTADO
            if (analisisNeto) {
                resultado.netoPorMinuto = analisisNeto.netoPorMinuto;
                resultado.clasificacionNeta = analisisNeto.clasificacionNeta;
                resultado.colorNeta = analisisNeto.colorNeta;
                resultado.gananciaNeta = analisisNeto.gananciaNeta;
                
                console.log('💰 Análisis neto calculado:', {
                    netoPorMinuto: resultado.netoPorMinuto,
                    clasificacion: resultado.clasificacionNeta
                });
            }
            
            // ✅ 4. APLICAR PROTECCIÓN DE VIAJES CORTOS
            resultado.minutosOriginales = minutos; // Guardar tiempo original
            resultado.distancia = distancia;
            resultado.trafficInsights = trafficInsights;
            resultado.tiempoAjustado = tiempoFinal;
            resultado.tiempoOriginal = minutos;
            resultado.fuenteDatos = fuenteDatos;
            
            // Aplicar protección
            const resultadoProtegido = aplicarProteccionViajesCortos(resultado);
            
            Actual = resultadoProtegido;
            
            // ✅ 5. MOSTRAR RESULTADO CON NETO
            mostrarResultadoRapido(resultadoProtegido);
        }
    } else {
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
// FUNCIÓN MEJORADA DE CÁLCULO CON PERFIL
// =============================================

function calcularRentabilidadConPerfil(tarifa, minutos, distancia) {
    if (!perfilActual) {
        console.error('❌ No hay perfil activo para calcular rentabilidad');
        return {
            rentabilidad: 'no-rentable',
            emoji: '❌',
            texto: 'NO RENTABLE',
            gananciaPorMinuto: 0,
            gananciaPorKm: 0
        };
    }

    console.log('🎯 Calculando con perfil:', {
        perfil: perfilActual.nombre,
        umbralMinutoRentable: perfilActual.umbralMinutoRentable,
        umbralKmRentable: perfilActual.umbralKmRentable,
        tarifa, minutos, distancia
    });

    try {
        // Cálculos de costo (usando los mismos del sistema existente)
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500;
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60);
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        
        // ✅ MÉTRICAS CLAVE CON DATOS REALES
        const gananciaPorMinuto = minutos > 0 ? (tarifa / minutos) : 0;
        const gananciaPorKm = distancia > 0 ? (tarifa / distancia) : 0;
        
        console.log('📈 Métricas calculadas:', {
            gananciaPorMinuto,
            gananciaPorKm,
            umbralMinutoRentable: perfilActual.umbralMinutoRentable,
            umbralKmRentable: perfilActual.umbralKmRentable,
            umbralMinutoOportunidad: perfilActual.umbralMinutoOportunidad,
            umbralKmOportunidad: perfilActual.umbralKmOportunidad
        });

        // ✅ DETERMINAR RENTABILIDAD CON UMBRALES ACTUALES DEL PERFIL
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

        console.log('🎯 Resultado rentabilidad:', {
            rentabilidad,
            texto,
            gananciaPorMinuto,
            gananciaPorKm
        });

        return {
            gananciaNeta: tarifa - costoTotal,
            gananciaPorMinuto: parseFloat(gananciaPorMinuto.toFixed(2)),
            gananciaPorKm: parseFloat(gananciaPorKm.toFixed(2)),
            costoCombustible,
            costoMantenimiento,
            costoSeguro,
            costoTotal,
            rentabilidad,
            emoji,
            texto
        };
        
    } catch (error) {
        console.error('❌ Error en cálculo de rentabilidad:', error);
        return {
            rentabilidad: 'no-rentable',
            emoji: '❌',
            texto: 'NO RENTABLE',
            gananciaPorMinuto: 0,
            gananciaPorKm: 0
        };
    }
}

// =============================================
// SISTEMA DE PERFILES
// =============================================

function mostrarConfigPerfil(perfil = null) {
    const form = elementos['perfil-form'];
    if (!form) return;
    
    if (perfil) {
        // Cargar TODOS los valores del perfil, incluyendo los umbrales
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.nombre;
        document.getElementById('tipo-medida').value = perfil.tipoMedida;
        document.getElementById('tipo-combustible').value = perfil.tipoCombustible;
        document.getElementById('rendimiento').value = perfil.rendimiento;
        document.getElementById('precio-combustible').value = perfil.precioCombustible;
        document.getElementById('moneda').value = perfil.moneda;
        
        // ESTAS SON LAS LÍNEAS IMPORTANTES - Cargar los umbrales guardados
        document.getElementById('umbral-minuto-rentable').value = perfil.umbralMinutoRentable || 6.00;
        document.getElementById('umbral-km-rentable').value = perfil.umbralKmRentable || 25.00;
        document.getElementById('umbral-minuto-oportunidad').value = perfil.umbralMinutoOportunidad || 5.00;
        document.getElementById('umbral-km-oportunidad').value = perfil.umbralKmOportunidad || 23.00;
        
        document.getElementById('costo-seguro').value = perfil.costoSeguro || 0;
        document.getElementById('costo-mantenimiento').value = perfil.costoMantenimiento || 0;
    } else {
        // Para nuevo perfil, usar valores por defecto
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
        // Asegurar que se guarden los valores actuales de los umbrales
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
    
    // Verificar que los valores se están guardando correctamente
    console.log('💾 Guardando perfil con rendimiento:', perfil.rendimiento);
    console.log('💾 Umbrales guardados:', {
        minRent: perfil.umbralMinutoRentable,
        kmRent: perfil.umbralKmRentable,
        minOport: perfil.umbralMinutoOportunidad,
        kmOport: perfil.umbralKmOportunidad
    });
    
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
// FUNCIONES DE UTILIDAD - ACTUALIZADAS
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
    
    // ✅ ACTUALIZAR PANEL DE METAS
    actualizarPanelMetas(gananciaTotal, tiempoTotal, distanciaTotal, totalViajes, viajesRentables);
    
    console.log('📈 Estadísticas de HOY actualizadas');
}

// =============================================
// NUEVO: PANEL DE METAS VISUAL
// =============================================
function actualizarPanelMetas(gananciaHoy, tiempoHoy, distanciaHoy, totalViajes, viajesRentables) {
    const resumenContainer = document.getElementById('tab-resumen') || document.querySelector('.tab-content#tab-resumen');
    if (!resumenContainer) return;
    
    // Calcular metas
    const META_DIARIA = 1455;
    const META_MENSUAL = 32000;
    
    // Obtener ganancia mensual
    const primerDiaMes = new Date();
    primerDiaMes.setDate(1);
    primerDiaMes.setHours(0, 0, 0, 0);
    
    const gananciaMensual = historial
        .filter(item => item.aceptado && new Date(item.timestamp) >= primerDiaMes)
        .reduce((sum, item) => sum + (item.ganancia || item.tarifa || 0), 0);
    
    // Calcular NETO mensual (si tenemos los datos)
    let netoMensual = gananciaMensual;
    let costosMensuales = 0;
    
    if (typeof calcularCostosDesdePerfil === 'function') {
        // Estimar costos mensuales
        const distanciaMensual = historial
            .filter(item => item.aceptado && new Date(item.timestamp) >= primerDiaMes)
            .reduce((sum, item) => sum + (item.distancia || 0), 0);
        
        const tiempoMensual = historial
            .filter(item => item.aceptado && new Date(item.timestamp) >= primerDiaMes)
            .reduce((sum, item) => sum + (item.minutos || 0), 0);
        
        const costos = calcularCostosDesdePerfil(distanciaMensual, tiempoMensual);
        if (costos) {
            costosMensuales = costos.costoTotal;
            netoMensual = gananciaMensual - costosMensuales;
        }
    }
    
    // Porcentajes
    const porcentajeDiario = Math.min(100, (gananciaHoy / META_DIARIA) * 100);
    const porcentajeMensual = Math.min(100, (netoMensual / META_MENSUAL) * 100); // ✅ CAMBIO: Usar NETO
    const porcentajeNetoMensual = Math.min(100, (netoMensual / META_MENSUAL) * 100);
    
    // Calcular tiempo formateado
    const horas = Math.floor(tiempoHoy / 60);
    const minutos = Math.floor(tiempoHoy % 60);
    const tiempoFormateado = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;
    
    // Eficiencia REAL (usando datos del día)
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    
    // Ritmo actual
    const ritmoPorHora = tiempoHoy > 0 ? (gananciaHoy / tiempoHoy) * 60 : 0;
    
    // Días restantes y promedio necesario
    const diaActual = new Date().getDate();
    const diasRestantes = Math.max(0, 30 - diaActual);
    const promedioDiarioNecesario = diasRestantes > 0 ? (META_MENSUAL - netoMensual) / diasRestantes : 0; // ✅ CAMBIO: Usar NETO
    
    // Animación de olas en la barra
    const waveAnimation = `
        @keyframes wave {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
            100% { transform: translateY(0px); }
        }
        
        @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
        }
    `;
    
    // Añadir estilos animados
    const styleElement = document.createElement('style');
    styleElement.textContent = waveAnimation;
    document.head.appendChild(styleElement);
    
    // Generar HTML premium
    resumenContainer.innerHTML = `
        <div class="resumen-premium" style="padding: 20px; max-width: 900px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <!-- TÍTULO ANIMADO -->
            <div style="text-align: center; margin-bottom: 40px; animation: float 3s ease-in-out infinite;">
                <div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
                    🎯 Panel de Progreso
                </div>
                <div style="color: #8B5CF6; font-size: 14px; font-weight: 500; letter-spacing: 1px;">
                    SEGUIMIENTO EN TIEMPO REAL
                </div>
            </div>
            
            <!-- META DIARIA CON ONDAS -->
            <div class="meta-card-premium" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 24px; padding: 32px; margin-bottom: 30px; box-shadow: 0 20px 60px rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.1); position: relative; overflow: hidden;">
                <!-- Efecto de olas -->
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${porcentajeDiario}%; background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.2) 100%); border-radius: 24px 24px 0 0; transition: height 1s ease; z-index: 0;"></div>
                
                <!-- Contenido -->
                <div style="position: relative; z-index: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10B981, #34D399); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                                    📅
                                </div>
                                <div>
                                    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">Meta Diaria</h2>
                                    <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">Hoy • ${new Date().toLocaleDateString('es-DO', { weekday: 'long' })}</p>
                                </div>
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            <div style="font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px;">
                                ${porcentajeDiario.toFixed(1)}%
                            </div>
                            <div style="font-size: 14px; color: #10B981; font-weight: 600;">${formatearMoneda(gananciaHoy)} / ${formatearMoneda(META_DIARIA)}</div>
                        </div>
                    </div>
                    
                    <!-- BARRA DE PROGRESO CON ANIMACIÓN -->
                    <div style="height: 16px; background: rgba(229, 231, 235, 0.5); border-radius: 10px; overflow: hidden; margin-bottom: 30px; position: relative;">
                        <div style="position: absolute; top: 0; left: 0; height: 100%; width: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); animation: shimmer 2s infinite linear;"></div>
                        <div style="height: 100%; background: linear-gradient(90deg, #10B981, #34D399, #10B981); background-size: 200% 100%; width: ${porcentajeDiario}%; border-radius: 10px; animation: wave 3s ease infinite; transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
                    </div>
                    
                    <!-- KPI's DIARIOS -->
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                        <div style="text-align: center; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;" 
                             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';">
                            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 6px;">${formatearMoneda(gananciaHoy)}</div>
                            <div style="font-size: 12px; color: #6B7280; font-weight: 500;">GANANCIA</div>
                            <div style="height: 4px; background: #E5E7EB; border-radius: 2px; margin-top: 8px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, #10B981, #34D399); width: ${Math.min(100, (gananciaHoy / META_DIARIA) * 100)}%;"></div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;"
                             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';">
                            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 6px;">${tiempoFormateado}</div>
                            <div style="font-size: 12px; color: #6B7280; font-weight: 500;">TIEMPO</div>
                            <div style="height: 4px; background: #E5E7EB; border-radius: 2px; margin-top: 8px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, #3B82F6, #60A5FA); width: ${Math.min(100, (tiempoHoy / 480) * 100)}%;"></div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;"
                             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';">
                            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 6px;">${totalViajes}</div>
                            <div style="font-size: 12px; color: #6B7280; font-weight: 500;">VIAJES</div>
                            <div style="height: 4px; background: #E5E7EB; border-radius: 2px; margin-top: 8px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, #8B5CF6, #A78BFA); width: ${Math.min(100, (totalViajes / 10) * 100)}%;"></div>
                            </div>
                        </div>
                        
                        <div style="text-align: center; padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: all 0.3s;"
                             onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)';">
                            <div style="font-size: 24px; font-weight: 800; color: #111827; margin-bottom: 6px;">${formatearMoneda(ritmoPorHora)}</div>
                            <div style="font-size: 12px; color: #6B7280; font-weight: 500;">RITMO/HORA</div>
                            <div style="height: 4px; background: #E5E7EB; border-radius: 2px; margin-top: 8px; overflow: hidden;">
                                <div style="height: 100%; background: linear-gradient(90deg, #F59E0B, #FBBF24); width: ${Math.min(100, (ritmoPorHora / (META_DIARIA/8)) * 100)}%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- META MENSUAL CON GRÁFICO -->
            <div class="meta-mensual-premium" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 24px; padding: 32px; margin-bottom: 30px; box-shadow: 0 20px 60px rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3B82F6, #60A5FA); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            📊
                        </div>
                        <div>
                            <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">Meta Mensual</h2>
                            <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">${new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #3B82F6, #60A5FA); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 4px;">
                            ${porcentajeMensual.toFixed(1)}%
                        </div>
                        <div style="font-size: 14px; color: #3B82F6; font-weight: 600;">${formatearMoneda(netoMensual)} / ${formatearMoneda(META_MENSUAL)}</div>
                    </div>
                </div>
                
                <!-- BARRA DOBLE (BRUTO vs NETO) -->
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div style="font-size: 14px; color: #6B7280;">Progreso Bruto</div>
                        <div style="font-size: 14px; color: #6B7280;">${porcentajeMensual.toFixed(1)}%</div>
                    </div>
                    <div style="height: 16px; background: #E5E7EB; border-radius: 10px; overflow: hidden; margin-bottom: 16px;">
                        <div style="height: 100%; background: linear-gradient(90deg, #3B82F6, #60A5FA); width: ${porcentajeMensual}%; transition: width 1s ease; position: relative;">
                            <div style="position: absolute; right: 0; top: 0; bottom: 0; width: 4px; background: white; opacity: 0.5;"></div>
                        </div>
                    </div>
                    
                    ${costosMensuales > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div style="font-size: 14px; color: #6B7280;">
                            Progreso Neto <span style="font-size: 12px; color: #9CA3AF;">(después de costos)</span>
                        </div>
                        <div style="font-size: 14px; color: #6B7280;">${porcentajeNetoMensual.toFixed(1)}%</div>
                    </div>
                    <div style="height: 16px; background: #E5E7EB; border-radius: 10px; overflow: hidden;">
                        <div style="height: 100%; background: linear-gradient(90deg, #10B981, #34D399); width: ${porcentajeNetoMensual}%; transition: width 1s ease;"></div>
                    </div>
                    ` : ''}
                </div>
                
                <!-- FINANCIERO DETALLADO -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px;">
                    <div style="padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px; font-weight: 500;">INGRESO BRUTO</div>
                        <div style="font-size: 28px; font-weight: 800; color: #3B82F6;">${formatearMoneda(gananciaMensual)}</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Total ganado este mes</div>
                    </div>
                    
                    ${costosMensuales > 0 ? `
                    <div style="padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px; font-weight: 500;">COSTOS TOTALES</div>
                        <div style="font-size: 28px; font-weight: 800; color: #EF4444;">-${formatearMoneda(costosMensuales)}</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Combustible + Mantenimiento + Seguro</div>
                    </div>
                    
                    <div style="padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); grid-column: span 2;">
                        <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px; font-weight: 500;">INGRESO NETO REAL</div>
                        <div style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #10B981, #34D399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            ${formatearMoneda(netoMensual)}
                        </div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Lo que realmente ganas este mes</div>
                    </div>
                    ` : `
                    <div style="padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <div style="font-size: 14px; color: #6B7280; margin-bottom: 8px; font-weight: 500;">FALTANTE PARA META</div>
                        <div style="font-size: 28px; font-weight: 800; color: #F59E0B;">${formatearMoneda(META_MENSUAL - gananciaMensual)}</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Para llegar a RD$32,000</div>
                    </div>
                    `}
                </div>
                
                <!-- PRONÓSTICO -->
                <div style="padding: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1)); border-radius: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 14px; color: #3B82F6; font-weight: 600; margin-bottom: 4px;">📈 PRONÓSTICO DEL MES</div>
                            <div style="font-size: 18px; font-weight: 700; color: #111827;">
                                ${netoMensual >= META_MENSUAL ? '¡META SUPERADA!' : `Proyectado: ${formatearMoneda(netoMensual + (promedioDiarioNecesario * diasRestantes))}`}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 14px; color: #6B7280; margin-bottom: 4px;">Días restantes</div>
                            <div style="font-size: 24px; font-weight: 800; color: #8B5CF6;">${diasRestantes}</div>
                        </div>
                    </div>
                    ${diasRestantes > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="font-size: 13px; color: #6B7280;">
                            <span style="color: ${promedioDiarioNecesario <= META_DIARIA ? '#10B981' : '#F59E0B'}; font-weight: 600;">
                                ${promedioDiarioNecesario <= META_DIARIA ? '✅' : '⚠️'}
                                Necesitas ${formatearMoneda(promedioDiarioNecesario)}/día
                            </span>
                            para alcanzar la meta
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- RENDIMIENTO REAL CON ANIMACIÓN -->
            <div class="rendimiento-premium" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 24px; padding: 32px; box-shadow: 0 20px 60px rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #8B5CF6, #A78BFA); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);">
                            ⚡
                        </div>
                        <div>
                            <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0;">Rendimiento</h2>
                            <p style="color: #6B7280; font-size: 14px; margin: 4px 0 0;">Análisis de eficiencia</p>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="font-size: 36px; font-weight: 800; background: linear-gradient(135deg, #8B5CF6, #A78BFA); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            ${eficiencia.toFixed(1)}%
                        </div>
                        <div style="font-size: 14px; color: #8B5CF6; font-weight: 600;">Eficiencia del día</div>
                    </div>
                </div>
                
                <!-- MÉTRICAS DE RENDIMIENTO -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px;">
                    <div style="text-align: center; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #10B981, #34D399);"></div>
                        <div style="font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 8px;">${viajesRentables}/${totalViajes}</div>
                        <div style="font-size: 14px; color: #6B7280; font-weight: 500;">Viajes Rentables</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">${totalViajes > 0 ? `${viajesRentables} de ${totalViajes}` : 'Sin viajes'}</div>
                    </div>
                    
                    <div style="text-align: center; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #3B82F6, #60A5FA);"></div>
                        <div style="font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 8px;">
                            ${totalViajes > 0 ? formatearMoneda(gananciaHoy / totalViajes) : formatearMoneda(0)}
                        </div>
                        <div style="font-size: 14px; color: #6B7280; font-weight: 500;">Promedio/Viaje</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Por cada viaje aceptado</div>
                    </div>
                    
                    <div style="text-align: center; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
                        <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #F59E0B, #FBBF24);"></div>
                        <div style="font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 8px;">
                            ${distanciaHoy} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}
                        </div>
                        <div style="font-size: 14px; color: #6B7280; font-weight: 500;">Distancia</div>
                        <div style="font-size: 12px; color: #9CA3AF; margin-top: 4px;">Recorrido hoy</div>
                    </div>
                </div>
                
                <!-- ANÁLISIS DE TIEMPO -->
                <div style="padding: 20px; background: white; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="font-size: 14px; color: #6B7280; font-weight: 600; margin-bottom: 12px;">⏱️ Análisis de Tiempo</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                        <div>
                            <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Tiempo Total</div>
                            <div style="font-size: 18px; font-weight: 700; color: #111827;">${tiempoFormateado}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">Tiempo/Viaje</div>
                            <div style="font-size: 18px; font-weight: 700; color: #111827;">${totalViajes > 0 ? (tiempoHoy / totalViajes).toFixed(1) : '0'} min</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 4px;">$/Hora</div>
                            <div style="font-size: 18px; font-weight: 700; color: #${ritmoPorHora >= (META_DIARIA/8) ? '10B981' : ritmoPorHora >= ((META_DIARIA/8)*0.8) ? 'F59E0B' : 'EF4444'};">${formatearMoneda(ritmoPorHora)}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- MOTIVACIÓN FINAL -->
            <div style="text-align: center; margin-top: 40px; padding: 30px; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); border-radius: 24px; color: white; box-shadow: 0 20px 60px rgba(139, 92, 246, 0.3); animation: pulse 2s ease-in-out infinite;">
                <div style="font-size: 24px; font-weight: 800; margin-bottom: 12px;">${porcentajeMensual >= 100 ? '🎉 ¡META ALCANZADA!' : '💪 ¡SIGUE ASÍ!'}</div>
                <div style="font-size: 16px; opacity: 0.9; margin-bottom: 20px;">
                    ${porcentajeMensual >= 100 
                        ? '¡Has superado tu meta mensual de RD$32,000!' 
                        : `Vas al ${porcentajeMensual.toFixed(1)}% de tu meta. ${diasRestantes > 0 ? `Faltan ${diasRestantes} días.` : '¡Último día!'}`}
                </div>
                <div style="font-size: 28px; font-weight: 800; margin-top: 10px;">
                    ${formatearMoneda(gananciaMensual)} / ${formatearMoneda(META_MENSUAL)}
                </div>
            </div>
        </div>
    `;
}

function actualizarRendimientoUnificado(gananciaPorHora, viajePromedio, distanciaTotal, eficiencia) {
    console.log('🎯 Actualizando rendimiento unificado...');
    
    const elementosRendimiento = {
        'rendimiento-ganancia-hora-card': formatearMoneda(gananciaPorHora),
        'rendimiento-viaje-promedio-linea': formatearMoneda(viajePromedio),
        'rendimiento-distancia-total-card': `${distanciaTotal} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}`,
        'rendimiento-ganancia-hora-linea': `${formatearMoneda(gananciaPorHora)} por hora`,
        'rendimiento-eficiencia-card': `${eficiencia.toFixed(1)}%`,
        'rendimiento-eficiencia-badge': `Eficiencia: ${eficiencia.toFixed(1)}%`
    };
    
    Object.entries(elementosRendimiento).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });
    
    const progresoFill = document.getElementById('progreso-eficiencia-fill');
    if (progresoFill) {
        progresoFill.style.width = `${Math.min(eficiencia, 100)}%`;
        
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

function obtenerEstadisticasCompletas() {
    const viajesAceptados = historial.filter(v => v.aceptado === true);
    const totalViajes = viajesAceptados.length;
    
    const viajesRentables = viajesAceptados.filter(v => {
        return v.rentable === true || v.rentabilidad === 'rentable';
    }).length;
    
    const gananciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.ganancia || v.tarifa || 0), 0);
    const tiempoTotal = viajesAceptados.reduce((sum, v) => sum + (v.minutos || 0), 0);
    const distanciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.distancia || 0), 0);
    
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
    if (typeof valor !== 'number') return 'RD$0.00';
    
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${valor.toFixed(2)}`;
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
    console.log('🧹 Limpiando formulario completo...');
    
    // Limpiar timeout de cálculo automático
    if (timeoutCalculoAutomatico) {
        clearTimeout(timeoutCalculoAutomatico);
        timeoutCalculoAutomatico = null;
    }
    
    // Limpiar campos del formulario
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    
    // Ocultar resultado rápido
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.add('hidden');
    }
    
    // Limpiar variables
    Actual = null;
    calculoActual = null;
    
    // Cerrar cualquier modal abierto
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado completamente');
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
// NUEVO: BARRA DE META DIARIA
// =============================================
function actualizarBarraMetaDiaria(gananciaHoy, tiempoHoy, distanciaHoy) {
    const metaContainer = document.getElementById('meta-diaria-container');
    if (!metaContainer) {
        // Crear contenedor si no existe
        const statsContainer = document.querySelector('.stats-container');
        if (statsContainer) {
            statsContainer.insertAdjacentHTML('beforeend', `
                <div class="meta-diaria-card">
                    <div class="meta-header">
                        <span class="meta-icon">🎯</span>
                        <span class="meta-title">Meta Diaria</span>
                    </div>
                    <div class="meta-progress">
                        <div class="meta-bar-bg">
                            <div class="meta-bar-fill" id="meta-bar-fill"></div>
                        </div>
                        <div class="meta-info">
                            <span class="meta-current" id="meta-current">RD$0</span>
                            <span class="meta-target" id="meta-target">de RD$1,455</span>
                            <span class="meta-percentage" id="meta-percentage">0%</span>
                        </div>
                    </div>
                    <div class="meta-details">
                        <div class="meta-item">
                            <span class="meta-label">⏱️ Tiempo:</span>
                            <span class="meta-value" id="meta-tiempo">0h 0m</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">📏 Distancia:</span>
                            <span class="meta-value" id="meta-distancia">0 km</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">📈 Ritmo:</span>
                            <span class="meta-value" id="meta-ritmo">RD$0/h</span>
                        </div>
                    </div>
                </div>
            `);
        }
    }
    
    // Calcular meta diaria (32k ÷ 22 días)
    const metaDiaria = 32000 / 22; // ≈ RD$1,455
    const porcentajeMeta = Math.min(100, (gananciaHoy / metaDiaria) * 100);
    
    // Calcular ritmo necesario
    const ahora = new Date();
    const horaActual = ahora.getHours();
    const horaInicio = 8; // Asumiendo que empiezas a las 8 AM
    const horasTrabajadas = Math.max(0, horaActual - horaInicio);
    const horasRestantes = Math.max(0, 8 - horasTrabajadas); // 8 horas de trabajo
    
    const ritmoActual = tiempoHoy > 0 ? (gananciaHoy / tiempoHoy) * 60 : 0;
    const ritmoNecesario = horasRestantes > 0 ? 
        ((metaDiaria - gananciaHoy) / horasRestantes) : 0;
    
    // Actualizar elementos
    const metaBar = document.getElementById('meta-bar-fill');
    const metaCurrent = document.getElementById('meta-current');
    const metaTarget = document.getElementById('meta-target');
    const metaPercentage = document.getElementById('meta-percentage');
    const metaTiempo = document.getElementById('meta-tiempo');
    const metaDistancia = document.getElementById('meta-distancia');
    const metaRitmo = document.getElementById('meta-ritmo');
    
    if (metaBar) metaBar.style.width = `${porcentajeMeta}%`;
    if (metaCurrent) metaCurrent.textContent = formatearMoneda(gananciaHoy);
    if (metaTarget) metaTarget.textContent = `de ${formatearMoneda(metaDiaria)}`;
    if (metaPercentage) metaPercentage.textContent = `${porcentajeMeta.toFixed(1)}%`;
    
    // Color según progreso
    if (metaBar) {
        if (porcentajeMeta >= 100) {
            metaBar.style.background = 'linear-gradient(90deg, #00b09b, #96c93d)';
        } else if (porcentajeMeta >= 70) {
            metaBar.style.background = 'linear-gradient(90deg, #4facfe, #00f2fe)';
        } else if (porcentajeMeta >= 40) {
            metaBar.style.background = 'linear-gradient(90deg, #ff9a9e, #fecfef)';
        } else {
            metaBar.style.background = 'linear-gradient(90deg, #ff6b6b, #ffa8a8)';
        }
    }
    
    // Tiempo formateado
    const horas = Math.floor(tiempoHoy / 60);
    const minutos = Math.floor(tiempoHoy % 60);
    if (metaTiempo) metaTiempo.textContent = `${horas}h ${minutos}m`;
    
    // Distancia
    if (metaDistancia) metaDistancia.textContent = `${distanciaHoy} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}`;
    
    // Ritmo con indicador
    let ritmoHTML = formatearMoneda(ritmoActual) + '/h';
    if (ritmoActual > 0 && ritmoNecesario > 0) {
        if (ritmoActual >= ritmoNecesario) {
            ritmoHTML += ' ✅';
        } else {
            ritmoHTML += ` (necesitas ${formatearMoneda(ritmoNecesario)}/h)`;
        }
    }
    if (metaRitmo) metaRitmo.innerHTML = ritmoHTML;
}

// =============================================
// FUNCIONES DE PROCESAMIENTO DE VIAJES
// =============================================

function procesarViaje(aceptado) {
    console.log('🔄 Procesando viaje:', { aceptado, Actual: !!Actual });
    
    if (!Actual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    if (!perfilActual) {
        mostrarError('No hay perfil seleccionado. Por favor, selecciona un perfil primero.');
        return;
    }

    try {
        guardarEnHistorial(Actual, aceptado);
        
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
    console.log('⚡ Procesando viaje rápido:', { aceptado, Actual: !!Actual });
    
    if (!Actual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    // ✅ CERRAR MODAL DE CÁLCULO RÁPIDO INMEDIATAMENTE
    cerrarModalRapido();
    
    const viajeParaHistorial = {
        ...Actual,
        aceptado: aceptado, // ✅ ESTO DEBE RESPETARSE
        rentable: aceptado ? (Actual.rentabilidad === 'rentable') : false, // ✅ Si rechazas, NO es rentable
        emoji: aceptado ? Actual.emoji : '❌', // ✅ Emoji diferente para rechazados
        texto: aceptado ? Actual.texto : 'RECHAZADO' // ✅ Texto diferente
    };
    
    agregarAlHistorial(viajeParaHistorial);
    
    if (aceptado) {
        mostrarMensaje('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarMensaje('❌ Viaje rechazado', 'info');
        // ✅ LIMPIAR FORMULARIO CUANDO SE RECHAZA
        limpiarFormulario();
    }
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
}

function guardarEnHistorial(resultado, aceptado) {
    console.log('💾 GUARDANDO EN HISTORIAL...', { aceptado, resultado });
    
    if (!resultado) {
        console.error('❌ No hay resultado para guardar');
        return;
    }

    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: 'viaje_' + Date.now(),
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre,
        timestamp: new Date().toISOString(),
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

// =============================================
// SISTEMA DE PROTECCIÓN DE VIAJES CORTOS
// =============================================

function aplicarProteccionViajesCortos(resultado) {
    const minutos = resultado.minutos || resultado.tiempoOriginal || 0;
    const distancia = resultado.distancia || 0;
    const netoPorMinuto = resultado.netoPorMinuto || 0;
    
    const esViajeCorto = (minutos <= 15 || distancia <= 4);
    const esViajeMediano = (distancia > 4 && distancia <= 10);
    
    if (!esViajeCorto && !esViajeMediano) return resultado;
    
    console.log('🛡️ Aplicando protección para viaje:', {
        tipo: esViajeCorto ? 'CORTO' : 'MEDIANO',
        minutos, distancia, netoPorMinuto
    });
    
    // ✅ REGLA 1: Viajes cortos con neto >= 4 nunca son "no rentables"
    if (esViajeCorto && netoPorMinuto >= 4) {
        if (resultado.rentabilidad === 'no-rentable') {
            resultado.rentabilidad = 'oportunidad';
            resultado.emoji = '⚡';
            resultado.texto = 'OPORTUNIDAD (viaje corto)';
            resultado.protegido = true;
        }
    }
    
    // ✅ REGLA 2: Limitar penalización por tráfico en viajes medianos
    if (esViajeMediano && resultado.trafficInsights) {
        const factorTrafico = resultado.trafficInsights.trafficFactor || 1;
        if (factorTrafico > 1.3) {
            resultado.mensajeTrafico = `Tráfico alto (${Math.round((factorTrafico-1)*100)}%) - Considerar alternativas`;
        }
    }
    
    return resultado;
}

// =============================================
// SISTEMA DE RESULTADO RÁPIDO
// =============================================

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;

    // Cerrar modal existente
    cerrarModalRapido();

    // ✅ APLICAR PROTECCIÓN (por si acaso)
    resultado = aplicarProteccionViajesCortos(resultado);

    const modal = document.createElement('div');
    modal.id = 'modal-rapido';
    modal.className = 'modal-centrado-elegante';
    
    // Determinar clase de rentabilidad
    const esRentable = resultado.rentabilidad === 'rentable';
    const esOportunidad = resultado.rentabilidad === 'oportunidad';
    const fueProtegido = resultado.protegido === true;
    
    // Colores según rentabilidad
    let colorPrincipal, colorFondo, colorBorde;
    
    if (fueProtegido) {
        colorPrincipal = '#F59E0B'; // Naranja para protegidos
        colorFondo = 'rgba(245, 158, 11, 0.1)';
        colorBorde = 'rgba(245, 158, 11, 0.3)';
    } else if (esRentable) {
        colorPrincipal = '#10B981';
        colorFondo = 'rgba(16, 185, 129, 0.1)';
        colorBorde = 'rgba(16, 185, 129, 0.3)';
    } else if (esOportunidad) {
        colorPrincipal = '#F59E0B';
        colorFondo = 'rgba(245, 158, 11, 0.1)';
        colorBorde = 'rgba(245, 158, 11, 0.3)';
    } else {
        colorPrincipal = '#EF4444';
        colorFondo = 'rgba(239, 68, 68, 0.1)';
        colorBorde = 'rgba(239, 68, 68, 0.3)';
    }
    
    // Texto de decisión
    let textoDecision = resultado.texto || 'NO RENTABLE';
    if (fueProtegido) {
        textoDecision = 'PROTEGIDO - ' + textoDecision;
    }
    
    // Icono
    const icono = fueProtegido ? '🛡️' : 
                 esRentable ? '✓' : 
                 esOportunidad ? '⚠' : '✗';
    
    // Métricas clave
    const gananciaPorMinuto = resultado.gananciaPorMinuto || 0;
    const gananciaPorKm = resultado.gananciaPorKm || (resultado.tarifa / resultado.distancia) || 0;
    
    // ✅ CALCULAR IMPACTO EN META 32K
    const impactoMeta = resultado.netoPorMinuto ? 
        calcularImpactoEnMeta32k(resultado.netoPorMinuto) : null;
    
    // ✅ GENERAR HTML DEL MODAL
    modal.innerHTML = `
        <div class="modal-contenido-centrado" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); padding: 0; overflow: hidden; max-width: 400px; width: 90vw;">
            <!-- CABECERA -->
            <div style="background: ${colorFondo}; border-bottom: 1px solid ${colorBorde}; padding: 24px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: ${colorPrincipal}; color: white; border-radius: 50%; font-size: 24px; margin-bottom: 12px;">
                    ${icono}
                </div>
                <div style="font-size: 20px; font-weight: 600; color: ${colorPrincipal}; margin-bottom: 4px;">
                    ${textoDecision}
                    ${fueProtegido ? ' 🛡️' : ''}
                </div>
                <div style="font-size: 15px; color: #6B7280; font-weight: 500;">
                    ${formatearMoneda(resultado.tarifa)} • ${resultado.minutos || 0} min • ${resultado.distancia || 0} km
                </div>
                ${resultado.tiempoAjustado && resultado.tiempoAjustado !== resultado.tiempoOriginal ? `
                <div style="margin-top: 8px; font-size: 13px; color: #8B5CF6;">
                    ⏱️ Con tráfico: ${resultado.tiempoAjustado} min (+${Math.round(((resultado.tiempoAjustado / resultado.tiempoOriginal) - 1) * 100)}%)
                </div>
                ` : ''}
            </div>
            
            <!-- MÉTRICAS PRINCIPALES -->
            <div style="padding: 24px;">
                <!-- NETO (PRIORIDAD) -->
                ${resultado.netoPorMinuto ? `
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-size: 14px; color: #6B7280; font-weight: 500;">💰 NETO POR MINUTO</div>
                        <div style="font-size: 18px; font-weight: 700; color: ${resultado.colorNeta || '#6B7280'}">
                            ${formatearMoneda(resultado.netoPorMinuto)}
                        </div>
                    </div>
                    <div style="height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; background: ${resultado.colorNeta || '#6B7280'}; width: ${Math.min(100, (resultado.netoPorMinuto / 10) * 100)}%;"></div>
                    </div>
                    <div style="text-align: center; margin-top: 6px; font-size: 13px; color: ${resultado.colorNeta || '#6B7280'}; font-weight: 600;">
                        ${resultado.clasificacionNeta || ''}
                    </div>
                </div>
                ` : ''}
                
                <!-- BRUTO -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: ${impactoMeta ? '16px' : '24px'};">
                    <div style="text-align: center;">
                        <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px; font-weight: 500;">BRUTO/MIN</div>
                        <div style="font-size: 20px; font-weight: 700; color: #111827;">${formatearMoneda(gananciaPorMinuto)}</div>
                    </div>
                    
                    <div style="text-align: center;">
                        <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px; font-weight: 500;">BRUTO/KM</div>
                        <div style="font-size: 20px; font-weight: 700; color: #111827;">${formatearMoneda(gananciaPorKm)}</div>
                    </div>
                </div>
                
                <!-- IMPACTO EN META 32K -->
                ${impactoMeta ? `
                <div style="background: ${impactoMeta.color}15; border: 1px solid ${impactoMeta.color}30; border-radius: 10px; padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 16px;">${impactoMeta.icono}</span>
                        <span style="font-size: 13px; color: ${impactoMeta.color}; font-weight: 600;">Impacto en meta mensual</span>
                    </div>
                    <div style="font-size: 12px; color: #6B7280;">
                        ${impactoMeta.impacto} (${formatearMoneda(parseFloat(impactoMeta.ritmoViaje))}/min vs ${formatearMoneda(parseFloat(impactoMeta.ritmoNecesario))}/min necesarios)
                    </div>
                </div>
                ` : ''}
                
                <!-- MENSAJE DE PROTECCIÓN -->
                ${fueProtegido ? `
                <div style="background: #FFFBEB; border: 1px solid #FEF3C7; border-radius: 10px; padding: 12px; text-align: center;">
                    <div style="font-size: 13px; color: #92400E; font-weight: 500;">
                        🛡️ Viaje corto protegido - Neto aceptable (${formatearMoneda(resultado.netoPorMinuto)}/min)
                    </div>
                </div>
                ` : ''}
            </div>
            
            <!-- BOTONES -->
            <div style="padding: 20px 24px 24px; background: #F9FAFB; border-top: 1px solid #E5E7EB; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <button onclick="procesarViajeRapido(false)" 
                        style="padding: 14px; background: white; color: #374151; border: 1px solid #D1D5DB; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                        onmouseover="this.style.backgroundColor='#FEF2F2'; this.style.borderColor='#EF4444';"
                        onmouseout="this.style.backgroundColor='white'; this.style.borderColor='#D1D5DB';">
                    Rechazar
                </button>
                <button onclick="iniciarCronometroDesdeModal()" 
                        style="padding: 14px; background: ${colorPrincipal}; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                        onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-1px)';"
                        onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)';">
                    Aceptar Viaje
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    calculoActual = resultado;
    
    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalRapido();
        }
    });
}

function cerrarModalRapido() {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido) {
        modalRapido.remove(); // ✅ ELIMINA COMPLETAMENTE EL MODAL
    }
    calculoActual = null; // ✅ LIMPIA EL CÁLCULO ACTUAL
}

function iniciarCronometroDesdeModal() {
    if (calculoActual) {
        iniciarCronometroConViaje(calculoActual);
        cerrarModalRapido();
    }
}

function obtenerSubtituloRentabilidad(resultado) {
    const porMinuto = resultado.gananciaPorMinuto;
    if (porMinuto >= 20) return 'Excelentes ganancias';
    if (porMinuto >= 15) return 'Buenas condiciones';
    if (porMinuto >= 10) return 'Condiciones regulares';
    return 'Ganancias bajas';
}

function calcularEficiencia(resultado) {
    if (!perfilActual) return '0';
    
    const baseEfficiency = perfilActual.umbralMinutoRentable || 6.0;
    const actualEfficiency = resultado.gananciaPorMinuto || 0;
    
    if (actualEfficiency <= 0) return '0';
    
    const eficiencia = Math.min(100, (actualEfficiency / baseEfficiency) * 100);
    return eficiencia.toFixed(0);
}

function obtenerMensajeImpacto(trafficAnalysis) {
    const ajuste = trafficAnalysis.adjustment;
    if (ajuste > 50) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Viaje significativamente afectado`;
    if (ajuste > 20) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Considerar el impacto`;
    if (ajuste > 0) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Impacto mínimo`;
    return 'Tráfico fluido - Sin impacto en el tiempo';
}

// =============================================
// SISTEMA DE TRÁFICO EN TIEMPO REAL CON GOOGLE MAPS
// =============================================

class RealTimeTrafficSystem {
    constructor() {
        this.map = null;
        this.trafficLayer = null;
        this.currentLocation = null;
        this.radiusKm = 10;
        this.initialized = false;
    }

    async initializeGoogleMaps() {
        // Verificar que Google Maps esté disponible
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps no está disponible');
        }

        try {
            // Crear mapa oculto
            const mapContainer = document.createElement('div');
            mapContainer.style.cssText = 'position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
            document.body.appendChild(mapContainer);

            // Posición por defecto (Santo Domingo)
            const defaultPosition = { lat: 18.4861, lng: -69.9312 };

            this.map = new google.maps.Map(mapContainer, {
                zoom: 12,
                center: defaultPosition,
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'none'
            });

            // Capa de tráfico
            this.trafficLayer = new google.maps.TrafficLayer();
            this.trafficLayer.setMap(this.map);

            this.initialized = true;
            console.log('✅ Google Maps inicializado para análisis de tráfico');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando Google Maps:', error);
            this.initialized = false;
            throw error;
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                console.log('📍 Geolocalización no soportada, usando ubicación por defecto');
                this.currentLocation = { lat: 18.4861, lng: -69.9312, accuracy: 1000 };
                resolve(this.currentLocation);
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    console.log('📍 Ubicación obtenida:', this.currentLocation);
                    
                    // Centrar mapa en la ubicación actual
                    if (this.map) {
                        this.map.setCenter(this.currentLocation);
                    }
                    
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.warn('📍 No se pudo obtener ubicación, usando por defecto:', error);
                    // Ubicación por defecto (Santo Domingo)
                    this.currentLocation = { lat: 18.4861, lng: -69.9312, accuracy: 1000 };
                    resolve(this.currentLocation);
                },
                {
                    enableHighAccuracy: false,
                    timeout: 8000,
                    maximumAge: 300000
                }
            );
        });
    }

   // Analizar tráfico en el radio especificado
   async analyzeTrafficInRadius() {
    if (!this.initialized) {
        throw new Error('Sistema de tráfico no inicializado');
    }

    if (!this.currentLocation) {
        await this.getCurrentLocation();
    }

    try {
        // ✅ OBTENER DURACIÓN DEL VIAJE DEL FORMULARIO
        const minutosViaje = parseFloat(elementos.minutos?.value) || 0;
        
        // ✅ CALCULAR RADIO ADAPTATIVO SEGÚN DURACIÓN
        const radioAdaptativo = this.calcularRadioPorDuracion(minutosViaje);
        
        // ✅ GUARDAR RADIO CALCULADO PARA USO EN REPORTES
        this.radiusKm = radioAdaptativo;
        
        // ✅ OBTENER DATOS DE TRÁFICO CON RADIO ADAPTATIVO
        const trafficData = await this.getTrafficDataConRadioAdaptativo(radioAdaptativo);
        
        // ✅ RETORNAR ANÁLISIS CON RADIO PERSONALIZADO
        const impacto = this.calculateTrafficImpact(trafficData);
        impacto.radioAdaptativo = radioAdaptativo; // Agregar info de radio usado
        
        return impacto;
        
    } catch (error) {
        console.error('❌ Error analizando tráfico con radio adaptativo:', error);
        return this.getConservativeEstimate();
    }
}

calcularRadioPorDuracion(minutosViaje) {
    // ✅ LÓGICA ADAPTATIVA: Menos tiempo = radio más pequeño
    console.log('🎯 Calculando radio adaptativo para:', minutosViaje, 'minutos');
    
    if (minutosViaje <= 5) {
        // Viajes MUY cortos (menos de 5 min): solo 2km alrededor
        console.log('📍 Radio: 2km (viaje muy corto)');
        return 2;
    } else if (minutosViaje <= 15) {
        // Viajes cortos (5-15 min): radio moderado de 4km
        console.log('📍 Radio: 4km (viaje corto)');
        return 4;
    } else if (minutosViaje <= 30) {
        // Viajes medios (15-30 min): radio de 6km
        console.log('📍 Radio: 6km (viaje medio)');
        return 6;
    } else if (minutosViaje <= 45) {
        // Viajes largos (30-45 min): radio de 8km
        console.log('📍 Radio: 8km (viaje largo)');
        return 8;
    } else {
        // Viajes muy largos (+45 min): radio completo de 10km
        console.log('📍 Radio: 10km (viaje muy largo)');
        return 10;
    }
}

async getTrafficDataConRadioAdaptativo(radioKm) {
    return new Promise((resolve) => {
        // Simulación mejorada que considera el radio
        setTimeout(() => {
            const trafficCondition = this.estimateTrafficFromConditions();
            
            // ✅ AJUSTAR CONFIANZA SEGÚN RADIO
            let confianzaAjustada = trafficCondition.confidence;
            if (radioKm <= 4) {
                confianzaAjustada += 0.1; // Más confiable en radios pequeños
            } else if (radioKm >= 8) {
                confianzaAjustada -= 0.05; // Menos confiable en radios grandes
            }
            
            resolve({
                ...trafficCondition,
                confidence: Math.min(0.95, Math.max(0.5, confianzaAjustada)),
                radioKm: radioKm, // Incluir radio usado
                message: `${trafficCondition.message} (Radio: ${radioKm}km)`
            });
        }, 1500);
    });
}

    async getTrafficData() {
        return new Promise((resolve) => {
            // Simulación de análisis de tráfico basado en hora y ubicación
            setTimeout(() => {
                const trafficCondition = this.estimateTrafficFromConditions();
                resolve(trafficCondition);
            }, 1500);
        });
    }

    estimateTrafficFromConditions() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    let condition, factor, confidence;

    // Lógica mejorada de tráfico para República Dominicana
    if (isWeekend) {
        if (hour >= 11 && hour <= 20) {
            condition = 'moderate';
            factor = 1.4;
            confidence = 0.8;
        } else {
            condition = 'light';
            factor = 1.1;
            confidence = 0.9;
        }
    } else {
        // Hora pico en RD: 7-9 AM y 5-7 PM
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            condition = 'heavy';
            factor = 1.8;
            confidence = 0.9;
        } else if (hour >= 12 && hour <= 14) {
            condition = 'moderate';
            factor = 1.3;
            confidence = 0.7;
        } else {
            condition = 'light';
            factor = 1.1;
            confidence = 0.8;
        }
    }

    return {
        condition,
        trafficFactor: factor,
        confidence,
        radius: this.radiusKm,
        location: this.currentLocation,
        timestamp: now.toISOString(),
        message: this.getTrafficMessage(condition) // ← AQUÍ ESTÁ EL ERROR
    };
}

getTrafficMessage(condition) {
    const messages = {
        light: '✅ Tráfico fluido - Condiciones normales',
        moderate: '⚠️ Tráfico moderado - Pequeñas demoras',
        heavy: '🚗 Tráfico pesado - Demoras considerables',
        severe: '🚨 Congestión severa - Demoras extensas'
    };
    
    return messages[condition] || `Condiciones de tráfico: ${condition}`;
}
    
calculateTrafficImpact(trafficData) {
    const baseTime = parseFloat(elementos.minutos?.value) || 0;
    const distancia = parseFloat(elementos.distancia?.value) || 0;
    
    if (baseTime <= 0) {
        return {
            originalTime: 0,
            adjustedTime: 0,
            trafficCondition: 'unknown',
            adjustment: 0,
            message: 'Ingresa el tiempo estimado primero',
            radioUsado: 0
        };
    }

    // ✅ 1. LIMITAR PENALIZACIÓN MÁXIMA SEGÚN DURACIÓN/DISTANCIA
    let factorLimitado = trafficData.trafficFactor;
    
    console.log('🎯 Aplicando límites de penalización:', {
        minutos: baseTime,
        distancia: distancia,
        factorOriginal: factorLimitado
    });
    
    // Protección para viajes cortos
    if (baseTime <= 15 || distancia <= 4) {
        factorLimitado = Math.min(factorLimitado, 1.15); // Máx 15% extra
        console.log('🛡️ Viaje corto protegido: factor limitado a', factorLimitado);
    } 
    // Viajes medianos
    else if (distancia <= 10) {
        factorLimitado = Math.min(factorLimitado, 1.3); // Máx 30% extra
        console.log('📍 Viaje mediano: factor limitado a', factorLimitado);
    }
    // Viajes largos mantienen factor original
    
    // ✅ 2. CALCULAR RADIO ADAPTATIVO
    const radioAdaptativo = this.calcularRadioPorDuracion(baseTime);
    
    // ✅ 3. APLICAR RADIO A FACTOR (radio más pequeño = factor más preciso)
    let factorConRadio = factorLimitado;
    if (radioAdaptativo <= 4) {
        // Radio pequeño = análisis más preciso, mantener factor
        console.log('🎯 Radio pequeño (' + radioAdaptativo + 'km): análisis preciso');
    } else if (radioAdaptativo >= 8) {
        // Radio grande = análisis menos preciso, reducir impacto
        factorConRadio = 1 + ((factorLimitado - 1) * 0.8);
        console.log('📍 Radio grande (' + radioAdaptativo + 'km): impacto reducido 20%');
    }

    const adjustedTime = Math.ceil(baseTime * factorConRadio);

    return {
        originalTime: baseTime,
        adjustedTime: adjustedTime,
        trafficCondition: trafficData.condition,
        trafficFactor: factorConRadio,
        adjustment: Math.round((factorConRadio - 1) * 100),
        confidence: trafficData.confidence,
        radius: radioAdaptativo,
        message: this.getAdaptiveTrafficMessage(trafficData, baseTime, distancia, factorConRadio),
        location: trafficData.location,
        isShortTrip: (baseTime <= 15 || distancia <= 4),
        protectionApplied: (factorConRadio < trafficData.trafficFactor),
        radioUsado: radioAdaptativo
    };
}

// ✅ MÉTODO DE LA CLASE - DENTRO DE RealTimeTrafficSystem
getAdaptiveTrafficMessage(trafficData, minutos, distancia, factorFinal) {
    let baseMsg = trafficData.message || '';
    
    let msgExtra = '';
    if (minutos <= 15 || distancia <= 4) {
        msgExtra = " ⚡ Viaje corto - impacto limitado";
    } else if (distancia <= 10) {
        msgExtra = " 📍 Radio adaptativo aplicado";
    }
    
    if (factorFinal < trafficData.trafficFactor) {
        msgExtra += ` (penalización reducida de ${Math.round((trafficData.trafficFactor-1)*100)}% a ${Math.round((factorFinal-1)*100)}%)`;
    }
    
    return baseMsg + msgExtra;
}

} // ← ¡IMPORTANTE! ESTE CIERRE FALTABA PARA LA CLASE RealTimeTrafficSystem

// =============================================
// ✅ FUNCIÓN GLOBAL DE INICIALIZACIÓN - FUERA DE LA CLASE
// =============================================

async function inicializarSistemaTraficoCompleto() {
    console.log('🚗 Inicializando sistema de tráfico en tiempo real...');
    
    try {
        // Verificar que Google Maps esté disponible
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps no está disponible');
        }
        
        realTimeTraffic = new RealTimeTrafficSystem();
        await realTimeTraffic.initializeGoogleMaps();
        
        // Obtener ubicación actual (no bloqueante)
        realTimeTraffic.getCurrentLocation().then(() => {
            console.log('📍 Ubicación lista para análisis de tráfico');
        }).catch(error => {
            console.warn('📍 Ubicación no disponible, usando valores por defecto');
        });
        
        console.log('✅ Sistema de tráfico en tiempo real inicializado');
        return true;
        
    } catch (error) {
        console.error('❌ Error inicializando sistema de tráfico:', error);
        // No impedir que la app funcione si falla Google Maps
        realTimeTraffic = null;
        return false;
    }
}
    
// =============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// =============================================

function configurarEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    inicializarTabs();
    
    if (elementos.tarifa) {
        elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.minutos) {
        elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.distancia) {
        elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    }
    
    if (elementos['aceptar-viaje']) {
        elementos['aceptar-viaje'].addEventListener('click', () => procesarViaje(true));
    }
    if (elementos['rechazar-viaje']) {
        elementos['rechazar-viaje'].addEventListener('click', () => procesarViaje(false));
    }
    
    if (elementos['clear-history']) {
        elementos['clear-history'].addEventListener('click', limpiarHistorialCompleto);
    }
    
    if (elementos['exportar-historial']) {
        elementos['exportar-historial'].addEventListener('click', mostrarExportModal);
    }
    
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
    
    if (elementos['theme-toggle']) {
        elementos['theme-toggle'].addEventListener('click', alternarTema);
    }
  
    if (elementos['sync-status-btn']) {
        elementos['sync-status-btn'].addEventListener('click', mostrarPanelSync);
    }
    
    // Botón de activar ubicación
    if (elementos['activar-ubicacion-btn']) {
        elementos['activar-ubicacion-btn'].addEventListener('click', activarUbicacion);
    }
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cambiarFiltroHistorial(btn.dataset.filtro);
        });
    });
    
    console.log('✅ Event listeners configurados');

// ✅ AGREGAR ESTO - Botón de migración
    if (elementos['migrar-viajes']) {
        elementos['migrar-viajes'].addEventListener('click', function() {
            if (confirm('¿Actualizar la rentabilidad de todos tus viajes antiguos?\n\nEsto recalculará si son rentables según tu perfil actual.')) {
                migrarViajesAntiguos();
            }
        });
    } else {
        // Si el elemento no existe, creamos el event listener de otra forma
        setTimeout(() => {
            const migrarBtn = document.getElementById('migrar-viajes');
            if (migrarBtn) {
                migrarBtn.addEventListener('click', function() {
                    if (confirm('¿Actualizar la rentabilidad de todos tus viajes antiguos?\n\nEsto recalculará si son rentables según tu perfil actual.')) {
                        migrarViajesAntiguos();
                    }
                });
            }
        }, 1000);
    }
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

// =============================================
// MODIFICACIONES A LA FUNCIÓN activarUbicacion
// =============================================

function activarUbicacion() {
    console.log('📍 Activando sistema de ubicación...');
    
    const btn = document.getElementById('activar-ubicacion-btn');
    const status = document.getElementById('location-status');
    
    // ✅ INICIALIZAR ANILLO SI NO EXISTE
    if (!locationStatusRing) {
        locationStatusRing = new LocationStatusRing();
    }
    
    // 🟡 ESTADO DE CARGA
    locationStatusRing.setLoading();
    
    if (btn) {
        btn.innerHTML = '<span class="button-icon">🔄</span> Obteniendo ubicación...';
        btn.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('✅ Ubicación obtenida correctamente');

            // 🟢 ESTADO ACTIVO
            locationStatusRing.setActive();
            
            if (btn) {
                btn.style.display = 'none';
            }
            if (status) {
                status.classList.remove('hidden');
            }
            
            if (trafficAnalyzer) {
                trafficAnalyzer.lastLocation = {
                    coords: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    },
                    timestamp: Date.now()
                };
            }
            
            mostrarMensaje('📍 Ubicación activada - Análisis de tráfico funcionando', 'success');
            
            const minutos = parseFloat(elementos.minutos?.value) || 0;
            if (minutos > 0) {
                setTimeout(calcularAutomatico, 500);
            }
        },
        (error) => {
            console.error('❌ Error obteniendo ubicación:', error);

            // 🔴 ESTADO DE ERROR
            locationStatusRing.setError();
            
            if (btn) {
                btn.innerHTML = '<span class="button-icon">📍</span> Activar Análisis de Tráfico';
                btn.disabled = false;
            }
            
            let mensaje = 'No se pudo obtener la ubicación. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    mensaje += 'Permiso denegado.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    mensaje += 'Ubicación no disponible.';
                    break;
                case error.TIMEOUT:
                    mensaje += 'Tiempo de espera agotado.';
                    break;
                default:
                    mensaje += 'Error desconocido.';
            }
            
            mostrarError(mensaje);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// =============================================
// SISTEMA DE ANILLO DE ESTADO DE UBICACIÓN
// =============================================

class LocationStatusRing {
    constructor() {
        this.ringElement = document.getElementById('logo-status-ring');
        this.currentState = 'inactive';
        this.initializeRing();
    }

    initializeRing() {
        if (!this.ringElement) {
            console.warn('⚠️ Elemento logo-status-ring no encontrado');
            return;
        }
        
        // Estado inicial - siempre visible
        this.ringElement.style.display = 'block';
        this.setInactive();
        
        console.log('✅ Anillo de estado inicializado');
    }

    setActive() {
        if (!this.ringElement) return;
        
        this.ringElement.className = 'logo-status-ring active';
        this.currentState = 'active';
        console.log('🟢 Anillo de estado: ACTIVO');
    }

    setError() {
        if (!this.ringElement) return;
        
        this.ringElement.className = 'logo-status-ring error';
        this.currentState = 'error';
        console.log('🔴 Anillo de estado: ERROR');
    }

    setLoading() {
        if (!this.ringElement) return;
        
        this.ringElement.className = 'logo-status-ring loading';
        this.currentState = 'loading';
        console.log('🟡 Anillo de estado: CARGANDO');
    }

    setInactive() {
        if (!this.ringElement) return;
        
        this.ringElement.className = 'logo-status-ring';
        this.currentState = 'inactive';
        console.log('⚫ Anillo de estado: INACTIVO');
    }

    getCurrentState() {
        return this.currentState;
    }
}

// Instancia global del anillo de estado
let locationStatusRing = null;

// =============================================
// INICIALIZACIÓN AUTOMÁTICA AL CARGAR LA APP
// =============================================

async function inicializarSistemaUbicacion() {
    console.log('📍 Inicializando sistema de ubicación automática...');
    
    // ✅ INICIALIZAR ANILLO DE ESTADO
    locationStatusRing = new LocationStatusRing();
    
    // ✅ FORZAR VISIBILIDAD INICIAL
    setTimeout(() => {
        const anillo = document.getElementById('logo-status-ring');
        if (anillo) {
            anillo.style.display = 'block';
            anillo.style.visibility = 'visible';
            anillo.style.opacity = '1';
            console.log('✅ Visibilidad del anillo forzada');
        }
    }, 100);
    
    // Verificar si ya tenemos permisos de ubicación
    if (navigator.permissions && navigator.permissions.query) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            
            if (permissionStatus.state === 'granted') {
                console.log('✅ Permisos de ubicación ya concedidos - Activando automáticamente');
                locationStatusRing.setActive();
                
                // Ocultar botón y mostrar estado
                const btn = document.getElementById('activar-ubicacion-btn');
                const status = document.getElementById('location-status');
                
                if (btn) btn.style.display = 'none';
                if (status) status.classList.remove('hidden');
                
            } else if (permissionStatus.state === 'prompt') {
                console.log('📍 Permisos de ubicación pendientes');
                locationStatusRing.setInactive();
            } else {
                console.log('❌ Permisos de ubicación denegados');
                locationStatusRing.setError();
            }
            
            // Escuchar cambios en los permisos
            permissionStatus.onchange = function() {
                console.log('🔄 Estado de permisos cambiado:', this.state);
                if (this.state === 'granted') {
                    locationStatusRing.setActive();
                    const btn = document.getElementById('activar-ubicacion-btn');
                    const status = document.getElementById('location-status');
                    if (btn) btn.style.display = 'none';
                    if (status) status.classList.remove('hidden');
                } else if (this.state === 'denied') {
                    locationStatusRing.setError();
                }
            };
            
        } catch (error) {
            console.warn('⚠️ No se pudo verificar el estado de permisos:', error);
            locationStatusRing.setInactive();
        }
    } else {
        // Fallback para navegadores que no soportan permissions API
        console.log('⚠️ Permissions API no soportada');
        locationStatusRing.setInactive();
    }
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

function exportarHistorialPDF() {
    console.log('📄 Generando PDF con análisis NETO completo...');
    
    if (!historial || historial.length === 0) {
        mostrarError('No hay historial para exportar');
        return;
    }

    try {
        const viajesFiltrados = filtrarHistorial(historial, filtroActual);
        const stats = obtenerEstadisticasCompletasConFiltro(viajesFiltrados);
        
        // ✅ CALCULAR NETO REAL PARA EL PDF
        let analisisNetoPDF = {
            gananciaBrutaTotal: stats.gananciaTotal,
            costosTotales: 0,
            gananciaNetaTotal: stats.gananciaTotal,
            tieneAnalisisNeto: false
        };
        
        if (typeof calcularCostosDesdePerfil === 'function' && perfilActual) {
            // Calcular costos totales de los viajes filtrados
            const distanciaTotal = stats.distanciaTotal;
            const tiempoTotal = stats.tiempoTotal;
            
            const costosTotales = calcularCostosDesdePerfil(distanciaTotal, tiempoTotal);
            if (costosTotales) {
                analisisNetoPDF = {
                    gananciaBrutaTotal: stats.gananciaTotal,
                    costosTotales: costosTotales.costoTotal,
                    gananciaNetaTotal: stats.gananciaTotal - costosTotales.costoTotal,
                    tieneAnalisisNeto: true,
                    costosDetallados: costosTotales
                };
            }
        }
        
        // Obtener información del filtro para el título
        const infoFiltro = obtenerInfoFiltroPDF();
        
        const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DIBER - Reporte Financiero Completo</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: white;
            padding: 40px;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
            color: white;
            padding: 50px 40px;
            text-align: center;
            border-radius: 20px 20px 0 0;
            margin-bottom: 40px;
        }
        
        .logo { font-size: 48px; margin-bottom: 20px; }
        .title { font-size: 32px; font-weight: 800; margin-bottom: 10px; }
        .subtitle { font-size: 16px; opacity: 0.9; font-weight: 400; letter-spacing: 1px; }
        .filtro-info { 
            font-size: 14px; 
            margin-top: 20px; 
            background: rgba(255,255,255,0.2); 
            padding: 10px 20px; 
            border-radius: 50px;
            display: inline-block;
        }
        
        .content { padding: 0 40px 40px; }
        
        .section {
            margin-bottom: 40px;
            background: #F9FAFB;
            border-radius: 16px;
            padding: 32px;
            border-left: 6px solid #8B5CF6;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        /* RESUMEN FINANCIERO COMPLETO */
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .financial-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border-top: 4px solid;
        }
        
        .card-bruto { border-top-color: #3B82F6; }
        .card-costos { border-top-color: #EF4444; }
        .card-neto { border-top-color: #10B981; }
        
        .financial-value {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 8px;
        }
        
        .financial-label {
            font-size: 14px;
            color: #6B7280;
            font-weight: 500;
        }
        
        /* DETALLE DE COSTOS */
        .costos-detalle {
            background: white;
            padding: 24px;
            border-radius: 12px;
            margin-top: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }
        
        .costos-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 16px;
        }
        
        .costo-item {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .costo-item:last-child {
            border-bottom: none;
            font-weight: 600;
            color: #1F2937;
        }
        
        /* ESTADÍSTICAS PRINCIPALES */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 24px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: 800;
            color: #8B5CF6;
            margin-bottom: 8px;
        }
        
        .stat-label {
            font-size: 14px;
            color: #6B7280;
            font-weight: 500;
        }
        
        /* TABLA DE VIAJES */
        .viajes-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .viajes-table th {
            background: #8B5CF6;
            color: white;
            padding: 16px;
            text-align: left;
            font-weight: 600;
        }
        
        .viajes-table td {
            padding: 14px 16px;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .viajes-table tr:hover {
            background: #F9FAFB;
        }
        
        .badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-rentable { background: #D1FAE5; color: #065F46; }
        .badge-oportunidad { background: #FEF3C7; color: #92400E; }
        .badge-no-rentable { background: #FEE2E2; color: #991B1B; }
        
        .footer {
            text-align: center;
            padding: 30px;
            background: #F9FAFB;
            color: #6B7280;
            font-size: 14px;
            border-top: 1px solid #E5E7EB;
            border-radius: 0 0 20px 20px;
            margin-top: 40px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px;
            color: #6B7280;
        }
        
        .neto-highlight {
            background: linear-gradient(135deg, #10B981, #34D399);
            color: white;
            padding: 30px;
            border-radius: 16px;
            text-align: center;
            margin: 30px 0;
        }
        
        .neto-value {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 10px;
        }
        
        @media print {
            body { padding: 0; }
            .container { box-shadow: none; }
            .header { border-radius: 0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗</div>
            <h1 class="title">DIBER - Reporte Financiero Completo</h1>
            <p class="subtitle">Análisis detallado de ingresos y costos reales</p>
            <div class="filtro-info">${infoFiltro.titulo} • ${infoFiltro.subtitulo}</div>
        </div>
        
        <div class="content">
            <!-- RESUMEN EJECUTIVO -->
            <div class="section">
                <h2 class="section-title">📊 Resumen Ejecutivo</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalViajes}</div>
                        <div class="stat-label">Total Viajes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.viajesRentables}</div>
                        <div class="stat-label">Viajes Rentables</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.eficiencia.toFixed(1)}%</div>
                        <div class="stat-label">Tasa de Eficiencia</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatearMonedaPDF(stats.gananciaTotal)}</div>
                        <div class="stat-label">Ganancia Total</div>
                    </div>
                </div>
            </div>
            
            <!-- ANÁLISIS FINANCIERO COMPLETO -->
            <div class="section">
                <h2 class="section-title">💰 Análisis Financiero Real</h2>
                
                <div class="financial-summary">
                    <div class="financial-card card-bruto">
                        <div class="financial-value">${formatearMonedaPDF(stats.gananciaTotal)}</div>
                        <div class="financial-label">INGRESO BRUTO TOTAL</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Suma de todas las tarifas</div>
                    </div>
                    
                    ${analisisNetoPDF.tieneAnalisisNeto ? `
                    <div class="financial-card card-costos">
                        <div class="financial-value">-${formatearMonedaPDF(analisisNetoPDF.costosTotales)}</div>
                        <div class="financial-label">COSTOS TOTALES REALES</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Combustible + Mantenimiento + Seguro</div>
                    </div>
                    
                    <div class="financial-card card-neto">
                        <div class="financial-value">${formatearMonedaPDF(analisisNetoPDF.gananciaNetaTotal)}</div>
                        <div class="financial-label">INGRESO NETO REAL</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Lo que realmente ganas</div>
                    </div>
                    ` : `
                    <div class="financial-card">
                        <div class="financial-value">${formatearMonedaPDF(stats.gananciaNeta)}</div>
                        <div class="financial-label">GANANCIA NETA</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Después de costos estimados</div>
                    </div>
                    
                    <div class="financial-card">
                        <div class="financial-value">${formatearMonedaPDF(stats.gananciaPorHora)}</div>
                        <div class="financial-label">POR HORA</div>
                        <div style="font-size: 12px; color: #6B7280; margin-top: 8px;">Ritmo de ganancia</div>
                    </div>
                    `}
                </div>
                
                ${analisisNetoPDF.tieneAnalisisNeto ? `
                <!-- DETALLE DE COSTOS -->
                <div class="costos-detalle">
                    <h3 style="color: #1F2937; margin-bottom: 16px; font-weight: 600;">📉 Desglose Detallado de Costos</h3>
                    <div class="costos-grid">
                        <div class="costo-item">
                            <span>Combustible:</span>
                            <span>${formatearMonedaPDF(analisisNetoPDF.costosDetallados.combustible)}</span>
                        </div>
                        <div class="costo-item">
                            <span>Mantenimiento:</span>
                            <span>${formatearMonedaPDF(analisisNetoPDF.costosDetallados.mantenimiento)}</span>
                        </div>
                        <div class="costo-item">
                            <span>Seguro:</span>
                            <span>${formatearMonedaPDF(analisisNetoPDF.costosDetallados.seguro)}</span>
                        </div>
                        <div class="costo-item">
                            <span>Depreciación:</span>
                            <span>${formatearMonedaPDF(analisisNetoPDF.costosDetallados.depreciacion)}</span>
                        </div>
                        <div class="costo-item" style="grid-column: span 2;">
                            <span style="font-weight: 600;">TOTAL COSTOS:</span>
                            <span style="font-weight: 600; color: #EF4444;">${formatearMonedaPDF(analisisNetoPDF.costosTotales)}</span>
                        </div>
                    </div>
                </div>
                
                <!-- DESTACADO NETO -->
                <div class="neto-highlight">
                    <div class="neto-value">${formatearMonedaPDF(analisisNetoPDF.gananciaNetaTotal)}</div>
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">INGRESO NETO REAL</div>
                    <div style="font-size: 14px; opacity: 0.9;">
                        Esto es lo que realmente ganas después de todos los costos operativos
                    </div>
                </div>
                ` : ''}
            </div>
            
            <!-- DETALLE DE VIAJES -->
            <div class="section">
                <h2 class="section-title">📋 Detalle de Viajes (${viajesFiltrados.length})</h2>
                ${viajesFiltrados.length > 0 ? `
                <table class="viajes-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Ganancia Bruta</th>
                            ${analisisNetoPDF.tieneAnalisisNeto ? '<th>Ganancia Neta*</th>' : ''}
                            <th>Tiempo</th>
                            <th>Distancia</th>
                            <th>$/Minuto</th>
                            <th>$/Km</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${viajesFiltrados.map(viaje => {
                            // Calcular neto por viaje si es posible
                            let netoViaje = '';
                            if (analisisNetoPDF.tieneAnalisisNeto && viaje.distancia && viaje.minutos) {
                                const costosViaje = calcularCostosDesdePerfil(viaje.distancia, viaje.minutos);
                                const gananciaNetaViaje = (viaje.ganancia || viaje.tarifa || 0) - (costosViaje?.costoTotal || 0);
                                netoViaje = `<td>${formatearMonedaPDF(gananciaNetaViaje)}</td>`;
                            }
                            
                            return `
                                <tr>
                                    <td>${viaje.fecha || 'N/A'}</td>
                                    <td><strong>${formatearMonedaPDF(viaje.ganancia || viaje.tarifa)}</strong></td>
                                    ${netoViaje}
                                    <td>${viaje.minutos || 0} min</td>
                                    <td>${viaje.distancia || 0} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</td>
                                    <td>${formatearMonedaPDF(viaje.gananciaPorMinuto || viaje.porMinuto)}/min</td>
                                    <td>${formatearMonedaPDF(viaje.gananciaPorKm || viaje.porKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</td>
                                    <td>
                                        <span class="badge ${obtenerClaseBadge(viaje)}">
                                            ${obtenerTextoBadge(viaje)}
                                        </span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ${analisisNetoPDF.tieneAnalisisNeto ? `
                <div style="font-size: 12px; color: #6B7280; margin-top: 10px; font-style: italic;">
                    *Ganancia Neta calculada usando tu perfil actual: ${perfilActual?.nombre || 'Perfil'}
                </div>
                ` : ''}
                ` : `
                <div class="empty-state">
                    <h3>No hay viajes en este período</h3>
                    <p>Los viajes aceptados aparecerán en el reporte</p>
                </div>
                `}
            </div>
            
            <!-- RESUMEN FINAL -->
            <div class="section">
                <h2 class="section-title">🎯 Resumen Final</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                    <div>
                        <h3 style="color: #1F2937; margin-bottom: 16px; font-weight: 600;">📈 Métricas Clave</h3>
                        <div style="display: grid; gap: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Tiempo total invertido:</span>
                                <span style="font-weight: 600;">${Math.floor(stats.tiempoTotal/60)}h ${stats.tiempoTotal%60}m</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Distancia total recorrida:</span>
                                <span style="font-weight: 600;">${stats.distanciaTotal} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Viaje promedio:</span>
                                <span style="font-weight: 600;">${formatearMonedaPDF(stats.viajePromedio)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Ganancia por hora:</span>
                                <span style="font-weight: 600;">${formatearMonedaPDF(stats.gananciaPorHora)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="color: #1F2937; margin-bottom: 16px; font-weight: 600;">📊 Rentabilidad</h3>
                        <div style="display: grid; gap: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span>Viajes rentables:</span>
                                <span style="font-weight: 600; color: #10B981;">${stats.viajesRentables} de ${stats.totalViajes}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Tasa de éxito:</span>
                                <span style="font-weight: 600; color: #10B981;">${stats.eficiencia.toFixed(1)}%</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span>Ganancia bruta total:</span>
                                <span style="font-weight: 600;">${formatearMonedaPDF(stats.gananciaTotal)}</span>
                            </div>
                            ${analisisNetoPDF.tieneAnalisisNeto ? `
                            <div style="display: flex; justify-content: space-between;">
                                <span>Ganancia neta real:</span>
                                <span style="font-weight: 600; color: #10B981;">${formatearMonedaPDF(analisisNetoPDF.gananciaNetaTotal)}</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Reporte generado por DIBER</strong> • ${new Date().toLocaleString('es-DO')}</p>
            <p>Perfil activo: <strong>${perfilActual?.nombre || 'No especificado'}</strong> • ${infoFiltro.titulo}</p>
            ${analisisNetoPDF.tieneAnalisisNeto ? `
            <p style="margin-top: 10px; color: #10B981; font-weight: 600;">
                ✅ Análisis neto incluido usando costos reales de tu perfil
            </p>
            ` : ''}
            <p style="margin-top: 10px;">¡Sigue maximizando tus ganancias reales! 🚀💰</p>
        </div>
    </div>
</body>
</html>
        `;

        const ventana = window.open('', '_blank');
        ventana.document.write(pdfContent);
        ventana.document.close();
        
        setTimeout(() => {
            ventana.print();
        }, 1000);
        
        mostrarMensaje('✅ PDF generado con análisis neto completo', 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        mostrarError('Error al generar el PDF');
    }
}

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

// FUNCIONES AUXILIARES PARA EL PDF
function obtenerEstadisticasCompletasConFiltro(viajesFiltrados) {
    const viajesAceptados = viajesFiltrados.filter(v => v.aceptado === true);
    const totalViajes = viajesAceptados.length;
    
    const viajesRentables = viajesAceptados.filter(v => {
        return v.rentable === true || v.rentabilidad === 'rentable';
    }).length;
    
    const gananciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.ganancia || v.tarifa || 0), 0);
    const tiempoTotal = viajesAceptados.reduce((sum, v) => sum + (v.minutos || 0), 0);
    const distanciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.distancia || 0), 0);
    
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

function obtenerInfoFiltroPDF() {
    const ahora = new Date();
    let titulo = '';
    let subtitulo = '';
    
    switch(filtroActual) {
        case 'hoy':
            const hoy = ahora.toLocaleDateString('es-DO');
            titulo = 'Reporte del Día';
            subtitulo = `Fecha: ${hoy}`;
            break;
        case 'semana':
            const inicioSemana = new Date(ahora);
            inicioSemana.setDate(ahora.getDate() - ahora.getDay());
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);
            titulo = 'Reporte Semanal';
            subtitulo = `Semana: ${inicioSemana.toLocaleDateString('es-DO')} - ${finSemana.toLocaleDateString('es-DO')}`;
            break;
        case 'mes':
            const mes = ahora.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
            titulo = 'Reporte Mensual';
            subtitulo = `Mes: ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
            break;
        case 'todos':
            titulo = 'Reporte Completo';
            subtitulo = 'Todos los viajes registrados';
            break;
        default:
            titulo = 'Reporte Personalizado';
            subtitulo = `Filtro: ${filtroActual}`;
    }
    
    return { titulo, subtitulo };
}

function formatearMonedaPDF(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

function obtenerClaseBadge(viaje) {
    const rentable = viaje.rentable !== undefined ? 
        Boolean(viaje.rentable) : 
        (viaje.rentabilidad === 'rentable');
    
    if (rentable) return 'badge-rentable';
    if (viaje.rentabilidad === 'oportunidad') return 'badge-oportunidad';
    return 'badge-no-rentable';
}

function obtenerTextoBadge(viaje) {
    const rentable = viaje.rentable !== undefined ? 
        Boolean(viaje.rentable) : 
        (viaje.rentabilidad === 'rentable');
    
    if (rentable) return 'RENTABLE';
    if (viaje.rentabilidad === 'oportunidad') return 'OPORTUNIDAD';
    return 'NO RENTABLE';
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
        mostrarError('Firebase no está disponible');
        return;
    }
    
    console.log('🔄 INICIANDO SINCRONIZACIÓN MANUAL...');
    mostrarStatus('🔄 Sincronizando todos los datos...', 'info');
    
    try {
        // ✅ SINCRONIZAR PERFILES
        console.log('📤 Subiendo perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        
        // ✅ SINCRONIZAR HISTORIAL COMPLETO
        console.log('📤 Subiendo historial...');
        const viajesParaSincronizar = historial.filter(item => item.aceptado !== false);
        let viajesSubidos = 0;
        
        for (const viaje of viajesParaSincronizar) {
            const exito = await firebaseSync.saveTrip(viaje);
            if (exito) viajesSubidos++;
        }
        
        // ✅ SINCRONIZAR DATOS DE APRENDIZAJE
        if (window.routeLearningSystem) {
            await window.routeLearningSystem.syncLocalLearning();
        }
        
        console.log('✅ Sincronización manual completada');
        mostrarStatus(`✅ Sincronizado: ${perfiles.length} perfiles, ${viajesSubidos} viajes`, 'success');
        
        // Actualizar interfaz
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
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

async function verificarConexionFirebase() {
    console.log('📡 Verificando conexión Firebase...');
    
    if (!firebaseSync) {
        console.log('❌ FirebaseSync no está inicializado');
        return false;
    }
    
    try {
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
    
    const firebaseOk = await verificarConexionFirebase();
    if (!firebaseOk) {
        mostrarError('No hay conexión con Firebase. Verifica tu internet.');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando todos los datos...', 'info');
    
    try {
        console.log('📤 Subiendo perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        console.log('✅ Perfiles sincronizados:', perfiles.length);
        
        console.log('📤 Subiendo viajes...');
        const viajesParaSincronizar = historial.filter(item => item.aceptado).slice(0, 50);
        let viajesSubidos = 0;
        
        for (const viaje of viajesParaSincronizar) {
            const exito = await firebaseSync.saveTrip(viaje);
            if (exito) viajesSubidos++;
        }
        console.log('✅ Viajes sincronizados:', viajesSubidos, 'de', viajesParaSincronizar.length);
        
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
        firebaseSync = null;
        firebaseInitialized = false;
        location.reload();
    }
}

function diagnosticarSincronizacion() {
    console.log('🔍 DIAGNÓSTICO DE SINCRONIZACIÓN COMPLETO');
    
    console.log('🌐 FIREBASE:');
    console.log('• Inicializado:', firebaseSync?.initialized);
    console.log('• User ID:', userCodeSystem.userId);
    console.log('• User Code:', userCodeSystem.userCode);
    
    console.log('💾 DATOS LOCALES:');
    console.log('• Perfiles:', perfiles.length);
    console.log('• Historial:', historial.length, 'viajes');
    console.log('• Perfil actual:', perfilActual?.nombre);
    
    return {
        firebaseInicializado: firebaseSync?.initialized,
        userCode: userCodeSystem.userCode,
        perfilesCount: perfiles.length,
        historialCount: historial.length
    };
}

// =============================================
// INICIALIZACIÓN MEJORADA - VERSIÓN CORREGIDA
// =============================================

async function inicializarApp() {
    if (window.appInitialized) {
        console.log('🚫 App ya inicializada, omitiendo...');
        return;
    }
    
    console.log('🚀 Inicializando DIBER...');
    
    inicializarElementosDOM();
    
    try {
        // ✅ NUEVO: Inicializar sistema de anillo de estado de ubicación (PRIMER PASO)
        console.log('📍 Inicializando sistema de anillo de estado...');
        await inicializarSistemaUbicacion();
        
        // ✅ PRIMERO: Inicializar sistema de código de usuario (NO DEPENDE DE GOOGLE MAPS)
        console.log('🔐 Inicializando sistema de código de usuario...');
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }

        // ✅ SEGUNDO: Cargar Google Maps SOLO UNA VEZ
        console.log('🗺️ Cargando Google Maps...');
        await loadGoogleMaps(); // Esta función ahora está en el HTML
        
        // ✅ TERCERO: Inicializar sistema de tráfico CON Google Maps
        console.log('🚗 Inicializando sistema de tráfico...');
        const trafficInitialized = await inicializarSistemaTraficoCompleto();
        
        if (trafficInitialized) {
            console.log('✅ Sistema de tráfico inicializado correctamente');
            // 🟢 Si el tráfico se inicializa correctamente, marcar ubicación como activa
            if (locationStatusRing) {
                locationStatusRing.setActive();
            }
        } else {
            console.log('⚠️ Google Maps no disponible, usando modo local');
            // 🟡 Si no hay Google Maps, mantener estado actual o marcar como inactivo
            if (locationStatusRing) {
                locationStatusRing.setInactive();
            }
        }
        
        // ✅ CUARTO: Inicializar Firebase (NO DEPENDE DE GOOGLE MAPS)
        await initializeFirebaseSync();
        
        // ✅ QUINTO: Inicializar sistema de auto-aprendizaje
        window.routeLearningSystem = new RouteLearningSystem();
        window.routeLearningSystem.initialized = true;
        console.log('🧠 Sistema de auto-aprendizaje inicializado');
        
        // ✅ SEXTO: Cargar datos
        await cargarDatos();
        
        // ✅ SÉPTIMO: Sincronizar aprendizaje local
        if (firebaseSync && firebaseSync.initialized) {
            setTimeout(() => {
                if (window.routeLearningSystem) {
                    window.routeLearningSystem.syncLocalLearning();
                }
            }, 3000);
        }

        // ✅ OCTAVO: Configurar interfaz
        aplicarTemaGuardado();
        configurarEventListeners();
        configurarModalExportacion();
        
        // ✅ NOVENO: Ocultar botón de activar ubicación si ya está activa
        const btnUbicacion = document.getElementById('activar-ubicacion-btn');
        const statusUbicacion = document.getElementById('location-status');
        
        if (locationStatusRing && locationStatusRing.getCurrentState() === 'active') {
            if (btnUbicacion) btnUbicacion.style.display = 'none';
            if (statusUbicacion) statusUbicacion.classList.remove('hidden');
        }
        
        // ✅ DÉCIMO: Mostrar pantalla correcta
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
        } else {
            mostrarPantalla('perfil');
        }
        
        window.appInitialized = true;
        console.log('🎉 DIBER inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        
        // 🔴 Marcar error en el anillo de estado
        if (locationStatusRing) {
            locationStatusRing.setError();
        }
        
        // ✅ MODO FALLBACK: Continuar sin Google Maps
        mostrarStatus('⚠️ Modo local activado - Funcionalidad básica disponible', 'info');
        
        // Inicializar componentes que no dependen de Google Maps
        try {
            await initializeUserCodeSystem();
            await initializeFirebaseSync();
            await cargarDatos();
            
            if (perfiles.length === 0) {
                mostrarPantalla('perfil');
            } else {
                mostrarPantalla('main');
            }
            
            aplicarTemaGuardado();
            configurarEventListeners();
            configurarModalExportacion();
            
        } catch (fallbackError) {
            console.error('❌ Error en modo fallback:', fallbackError);
            mostrarStatus('❌ Error crítico. Recarga la página.', 'error');
        }
    }
}

// ✅ FUNCIÓN SIMPLIFICADA: Solo verifica si Google Maps está disponible
function waitForGoogleMaps() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve();
            return;
        }
        
        // Si no está disponible, rechazar inmediatamente
        reject(new Error('Google Maps no está disponible'));
    });
}

// AGREGAR estas funciones utilitarias:

function mostrarEstadisticasAprendizaje() {
    console.log('📊 Mostrando estadísticas de aprendizaje...');
    
    const localLearning = JSON.parse(localStorage.getItem('DIBER_route_learning') || '[]');
    const totalViajesAprendizaje = historial.filter(v => v.aceptado !== false).length;
    
    const stats = {
        viajesParaAprendizaje: totalViajesAprendizaje,
        datosLocalesPendientes: localLearning.length,
        aprendizajeActivo: window.routeLearningSystem?.learningEnabled || false
    };
    
    alert(`🧠 ESTADÍSTICAS DE AUTO-APRENDIZAJE
    
• Viajes analizados: ${stats.viajesParaAprendizaje}
• Datos pendientes de sync: ${stats.datosLocalesPendientes}
• Sistema activo: ${stats.aprendizajeActivo ? '✅' : '❌'}

📈 El sistema aprende automáticamente de cada viaje que aceptas.
💾 Los datos se guardan localmente y se sincronizan con la nube.`);
}

// =============================================
// VERIFICADOR DE CONSISTENCIA EN HISTORIAL
// =============================================

function verificarConsistenciaHistorial() {
    console.log('🔍 Verificando consistencia del historial...');
    
    historial.forEach((viaje, index) => {
        if (viaje.aceptado && viaje.tiempoRealCapturado) {
            // Para viajes con tiempo real, verificar que la rentabilidad sea correcta
            const rentabilidadEsperada = calcularRentabilidadConPerfil(
                viaje.tarifa || viaje.ganancia,
                viaje.minutos, // Ya debería ser el tiempo real
                viaje.distancia
            );
            
            if (viaje.rentabilidad !== rentabilidadEsperada.rentabilidad) {
                console.warn('⚠️ Inconsistencia encontrada en viaje:', {
                    id: viaje.id,
                    rentabilidadActual: viaje.rentabilidad,
                    rentabilidadEsperada: rentabilidadEsperada.rentabilidad
                });
                
                // Opcional: Corregir automáticamente
                // historial[index] = { ...viaje, ...rentabilidadEsperada };
            }
        }
    });
    
    console.log('✅ Verificación de consistencia completada');
}

// Ejecutar al cargar la aplicación
setTimeout(verificarConsistenciaHistorial, 3000);

// =============================================
// MIGRACIÓN DE VIAJES ANTIGUOS - CORREGIR RENTABILIDAD
// =============================================

function migrarViajesAntiguos() {
    console.log('🔄 INICIANDO MIGRACIÓN DE VIAJES ANTIGUOS...');
    
    let viajesCorregidos = 0;
    let cambiosRealizados = false;

    historial.forEach((viaje, index) => {
        // Solo corregir viajes ACEPTADOS (no rechazados)
        if (viaje.aceptado !== false && perfilActual) {
            // ✅ RECALCULAR rentabilidad con perfil actual
            const rentabilidadRecalculada = calcularRentabilidadConPerfil(
                viaje.tarifa || viaje.ganancia,
                viaje.minutos, // Usar los minutos que ya están en el historial
                viaje.distancia || 1
            );

            // ✅ VERIFICAR si la rentabilidad cambió
            if (viaje.rentabilidad !== rentabilidadRecalculada.rentabilidad) {
                console.log('🔄 Corrigiendo viaje antiguo:', {
                    id: viaje.id,
                    fecha: viaje.fecha,
                    'Antes': viaje.rentabilidad,
                    'Después': rentabilidadRecalculada.rentabilidad,
                    gananciaPorMinuto: rentabilidadRecalculada.gananciaPorMinuto
                });

                // ✅ ACTUALIZAR el viaje con la rentabilidad correcta
                historial[index] = {
                    ...viaje,
                    rentabilidad: rentabilidadRecalculada.rentabilidad,
                    rentable: rentabilidadRecalculada.rentabilidad === 'rentable',
                    emoji: rentabilidadRecalculada.emoji,
                    texto: rentabilidadRecalculada.texto,
                    gananciaPorMinuto: rentabilidadRecalculada.gananciaPorMinuto,
                    gananciaPorKm: rentabilidadRecalculada.gananciaPorKm,
                    // Marcar como migrado
                    migrado: true
                };

                viajesCorregidos++;
                cambiosRealizados = true;
            }
        }
    });

    if (cambiosRealizados) {
        // ✅ GUARDAR cambios en localStorage
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        
        // ✅ ACTUALIZAR interfaz
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
        console.log(`✅ MIGRACIÓN COMPLETADA: ${viajesCorregidos} viajes corregidos`);
        mostrarStatus(`✅ Migración completada: ${viajesCorregidos} viajes actualizados`, 'success');
    } else {
        console.log('✅ No se encontraron viajes que necesiten corrección');
    }
}

// =============================================
// FUNCIONES GLOBALES
// =============================================

window.cerrarModal = cerrarModal;
window.cerrarModalRapido = cerrarModalRapido;
window.cerrarExportModal = cerrarExportModal;
window.cerrarSyncPanel = cerrarSyncPanel;
window.limpiarFormulario = limpiarFormulario;
window.limpiarFormularioCompleto = limpiarFormularioCompleto;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.cambiarUsuario = cambiarUsuario;
window.eliminarDelHistorial = eliminarDelHistorial;
window.limpiarHistorialCompleto = limpiarHistorialCompleto;
window.limpiarDatosMultiDispositivo = limpiarDatosMultiDispositivo;
window.procesarViajeRapido = procesarViajeRapido;
window.mostrarPanelSync = mostrarPanelSync;
window.forzarSincronizacion = forzarSincronizacion;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSincronizacion;
window.exportarHistorial = exportarHistorial;
window.exportarHistorialPDF = exportarHistorialPDF;
window.mostrarExportModal = mostrarExportModal;
window.diagnosticarSincronizacion = diagnosticarSincronizacion;
window.resincronizarCompleta = resincronizarCompleta;
window.resetearSincronizacion = resetearSincronizacion;
window.verificarConexionFirebase = verificarConexionFirebase;
window.mostrarEstadisticasAprendizaje = mostrarEstadisticasAprendizaje;

// =============================================
// EJECUCIÓN PRINCIPAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');
    inicializarApp();
});

window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = (elementos.tarifa && elementos.tarifa.value) || 
                                 (elementos.minutos && elementos.minutos.value) || 
                                 (elementos.distancia && elementos.distancia.value);
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.onclick = function(event) {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido && event.target === modalRapido) {
        cerrarModalRapido();
    }
    
    if (typeof elementos !== 'undefined') {
        if (elementos.modalFondo && event.target === elementos.modalFondo) {
            cerrarModal();
        }
        if (elementos.exportModal && event.target === elementos.exportModal) {
            cerrarExportModal();
        }
        if (elementos.syncPanel && event.target === elementos.syncPanel) {
            cerrarSyncPanel();
        }
    }
};

window.addEventListener('beforeunload', function() {
    if (firebaseSync) {
        firebaseSync.stopRealTimeListeners();
    }
});





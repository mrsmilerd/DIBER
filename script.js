// =============================================
// DIBER - Calculadora Inteligente para Conductores
// Versión Corregida - Orden de Funciones Optimizado
// =============================================

// =============================================
// 1. VARIABLES GLOBALES Y CONSTANTES
// =============================================

let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;
let filtroActual = 'hoy';
let Actual = null;
let timeoutCalculoAutomatico = null;

// Sistema de Código de Usuario
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// Variables de Control de Inicialización
let firebaseInitialized = false;
let loadingData = false;
let appInitialized = false;

// Sistema de Tráfico
let realTimeTraffic = null;
let trafficInitialized = false;

// Configuración Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
    authDomain: "diber-32875.firebaseapp.com",
    projectId: "diber-32875",
    storageBucket: "diber-32875.firebasestorage.app",
    messagingSenderId: "260349079723",
    appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// Elementos DOM
const elementos = {};

// Constantes de Negocio
const TIEMPO_ESPERA_GRATIS_SEGUNDOS = 120;
const TARIFA_EXTRA_POR_MINUTO = 2.86;

// Sistema de Cronómetro
let cronometro = {
    activo: false,
    inicio: null,
    tiempoTranscurridoSegundos: 0,
    intervalo: null,
    viajeActual: null,
    esperaActiva: false,
    intervaloEspera: null,
    estadoEspera: 'detenido',
    tiempoExtraCobradoSegundos: 0,
    inicioEspera: null
};

// =============================================
// 2. FUNCIONES DE UTILIDAD BÁSICAS
// =============================================

function formatearMoneda(valor) {
    if (typeof valor !== 'number') return 'RD$0.00';
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${valor.toFixed(2)}`;
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos['status-indicator'] || !elementos['status-text']) return;
    
    elementos['status-text'].textContent = mensaje;
    elementos['status-indicator'].className = `status-indicator ${tipo}`;
    elementos['status-indicator'].classList.remove('hidden');
    
    setTimeout(() => {
        if (elementos['status-indicator']) {
            elementos['status-indicator'].classList.add('hidden');
        }
    }, 3000);
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarMensaje(mensaje, tipo = 'info') {
    mostrarStatus(mensaje, tipo);
}

function formatearTiempo(segundos) {
    const min = Math.floor(Math.abs(segundos) / 60);
    const sec = Math.abs(segundos) % 60;
    const signo = segundos < 0 ? '-' : '';
    return `${signo}${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// =============================================
// 3. FUNCIONES DE LIMPIEZA
// =============================================

function cerrarModalRapido() {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido) {
        modalRapido.remove();
    }
    calculoActual = null;
}

function cerrarModal() {
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
}

function cerrarExportModal() {
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
}

function cerrarSyncPanel() {
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

function limpiarFormulario() {
    console.log('🧹 Limpiando formulario...');
    
    if (timeoutCalculoAutomatico) {
        clearTimeout(timeoutCalculoAutomatico);
        timeoutCalculoAutomatico = null;
    }
    
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.add('hidden');
    }
    
    Actual = null;
    calculoActual = null;
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado');
}

function limpiarFormularioCompleto() {
    console.log('🧹 Limpiando formulario completo...');
    
    if (timeoutCalculoAutomatico) {
        clearTimeout(timeoutCalculoAutomatico);
        timeoutCalculoAutomatico = null;
    }
    
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.add('hidden');
    }
    
    Actual = null;
    calculoActual = null;
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado completamente');
}

// =============================================
// 4. FUNCIONES DE ACTUALIZACIÓN DE UI
// =============================================

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

function cambiarFiltroHistorial(nuevoFiltro) {
    filtroActual = nuevoFiltro;
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filtro === nuevoFiltro);
    });
    
    actualizarHistorialConFiltros();
}

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

// =============================================
// 5. FUNCIONES DE RENTABILIDAD Y CÁLCULO
// =============================================

function calcularCostosDesdePerfil(distanciaKm, minutosReales) {
    if (!perfilActual) {
        console.error('❌ No hay perfil para calcular costos');
        return null;
    }
    
    const combustibleUsado = distanciaKm / perfilActual.rendimiento;
    const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
    
    const costoMantenimientoAnual = perfilActual.costoMantenimiento || 0;
    const costoMantenimientoPorKm = costoMantenimientoAnual / 20000;
    const costoMantenimientoViaje = distanciaKm * costoMantenimientoPorKm;
    
    const costoSeguroMensual = perfilActual.costoSeguro || 0;
    const minutosEnUnMes = 30 * 24 * 60;
    const costoSeguroPorMinuto = costoSeguroMensual / minutosEnUnMes;
    const costoSeguroViaje = minutosReales * costoSeguroPorMinuto;
    
    const depreciacionPorKm = 0.01;
    
    const costos = {
        combustible: parseFloat(costoCombustible.toFixed(2)),
        mantenimiento: parseFloat(costoMantenimientoViaje.toFixed(2)),
        depreciacion: parseFloat((distanciaKm * depreciacionPorKm).toFixed(2)),
        seguro: parseFloat(costoSeguroViaje.toFixed(2)),
        costoVariable: parseFloat((costoCombustible + costoMantenimientoViaje + (distanciaKm * depreciacionPorKm)).toFixed(2)),
        costoFijo: parseFloat(costoSeguroViaje.toFixed(2)),
        costoTotal: 0,
        costoPorKm: 0
    };
    
    costos.costoTotal = costos.costoVariable + costos.costoFijo;
    
    if (distanciaKm > 0) {
        costos.costoPorKm = parseFloat((costos.costoTotal / distanciaKm).toFixed(2));
    }
    
    return costos;
}

function calcularRentabilidadConPerfil(tarifa, minutos, distancia) {
    if (!perfilActual) {
        return {
            rentabilidad: 'no-rentable',
            emoji: '❌',
            texto: 'NO RENTABLE',
            gananciaPorMinuto: 0,
            gananciaPorKm: 0
        };
    }

    try {
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500;
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60);
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        
        const gananciaPorMinuto = minutos > 0 ? (tarifa / minutos) : 0;
        const gananciaPorKm = distancia > 0 ? (tarifa / distancia) : 0;
        
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

function calcularRentabilidadNetaInstantanea(tarifa, minutos, distancia) {
    if (!perfilActual) return null;
    
    const costos = calcularCostosDesdePerfil(distancia, minutos);
    if (!costos) return null;
    
    const gananciaNeta = tarifa - costos.costoTotal;
    const netoPorMinuto = minutos > 0 ? gananciaNeta / minutos : 0;
    
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

function aplicarProteccionViajesCortos(resultado) {
    const minutos = resultado.minutos || resultado.tiempoOriginal || 0;
    const distancia = resultado.distancia || 0;
    const netoPorMinuto = resultado.netoPorMinuto || 0;
    
    const esViajeCorto = (minutos <= 15 || distancia <= 4);
    const esViajeMediano = (distancia > 4 && distancia <= 10);
    
    if (!esViajeCorto && !esViajeMediano) return resultado;
    
    if (esViajeCorto && netoPorMinuto >= 4) {
        if (resultado.rentabilidad === 'no-rentable') {
            resultado.rentabilidad = 'oportunidad';
            resultado.emoji = '⚡';
            resultado.texto = 'OPORTUNIDAD (viaje corto)';
            resultado.protegido = true;
        }
    }
    
    return resultado;
}

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
        let trafficInsights = null;
        
        if (realTimeTraffic && realTimeTraffic.initialized) {
            try {
                trafficInsights = await realTimeTraffic.analyzeTrafficInRadius();
            } catch (error) {
                trafficInsights = realTimeTraffic?.getConservativeEstimate?.() || null;
            }
        }
        
        let tiempoFinal = minutos;
        let fuenteDatos = 'BASE';
        
        if (trafficInsights) {
            tiempoFinal = trafficInsights.adjustedTime || minutos;
            fuenteDatos = 'TRÁFICO REAL';
        }
        
        const resultado = calcularRentabilidadConPerfil(tarifa, tiempoFinal, distancia);
        
        if (resultado) {
            const analisisNeto = calcularRentabilidadNetaInstantanea(tarifa, tiempoFinal, distancia);
            
            if (analisisNeto) {
                resultado.netoPorMinuto = analisisNeto.netoPorMinuto;
                resultado.clasificacionNeta = analisisNeto.clasificacionNeta;
                resultado.colorNeta = analisisNeto.colorNeta;
                resultado.gananciaNeta = analisisNeto.gananciaNeta;
            }
            
            resultado.minutosOriginales = minutos;
            resultado.distancia = distancia;
            resultado.trafficInsights = trafficInsights;
            resultado.tiempoAjustado = tiempoFinal;
            resultado.tiempoOriginal = minutos;
            resultado.fuenteDatos = fuenteDatos;
            
            const resultadoProtegido = aplicarProteccionViajesCortos(resultado);
            
            Actual = resultadoProtegido;
            mostrarResultadoRapido(resultadoProtegido);
        }
    } else {
        if (elementos['resultado-rapido']) {
            elementos['resultado-rapido'].classList.add('hidden');
        }
        cerrarModalRapido();
    }
}

// =============================================
// 6. FUNCIONES DE RESULTADO RÁPIDO
// =============================================

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    cerrarModalRapido();
    resultado = aplicarProteccionViajesCortos(resultado);

    const modal = document.createElement('div');
    modal.id = 'modal-rapido';
    modal.className = 'modal-centrado-elegante';
    
    const esRentable = resultado.rentabilidad === 'rentable';
    const esOportunidad = resultado.rentabilidad === 'oportunidad';
    const fueProtegido = resultado.protegido === true;
    
    let colorPrincipal, colorFondo, colorBorde;
    
    if (fueProtegido) {
        colorPrincipal = '#F59E0B';
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
    
    let textoDecision = resultado.texto || 'NO RENTABLE';
    if (fueProtegido) {
        textoDecision = 'PROTEGIDO - ' + textoDecision;
    }
    
    const icono = fueProtegido ? '🛡️' : (esRentable ? '✓' : (esOportunidad ? '⚠' : '✗'));
    const gananciaPorMinuto = resultado.gananciaPorMinuto || 0;
    const gananciaPorKm = resultado.gananciaPorKm || (resultado.tarifa / resultado.distancia) || 0;
    
    modal.innerHTML = `
        <div class="modal-contenido-centrado" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.15); padding: 0; overflow: hidden; max-width: 400px; width: 90vw;">
            <div style="background: ${colorFondo}; border-bottom: 1px solid ${colorBorde}; padding: 24px; text-align: center;">
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: ${colorPrincipal}; color: white; border-radius: 50%; font-size: 24px; margin-bottom: 12px;">
                    ${icono}
                </div>
                <div style="font-size: 20px; font-weight: 600; color: ${colorPrincipal}; margin-bottom: 4px;">
                    ${textoDecision}
                </div>
                <div style="font-size: 15px; color: #6B7280; font-weight: 500;">
                    ${formatearMoneda(resultado.tarifa)} • ${resultado.minutos || 0} min • ${resultado.distancia || 0} km
                </div>
            </div>
            <div style="padding: 24px;">
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
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div style="text-align: center;">
                        <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px; font-weight: 500;">BRUTO/MIN</div>
                        <div style="font-size: 20px; font-weight: 700; color: #111827;">${formatearMoneda(gananciaPorMinuto)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 13px; color: #6B7280; margin-bottom: 6px; font-weight: 500;">BRUTO/KM</div>
                        <div style="font-size: 20px; font-weight: 700; color: #111827;">${formatearMoneda(gananciaPorKm)}</div>
                    </div>
                </div>
            </div>
            
            <div style="padding: 20px 24px 24px; background: #F9FAFB; border-top: 1px solid #E5E7EB; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <button onclick="procesarViajeRapido(false)" 
                        style="padding: 14px; background: white; color: #374151; border: 1px solid #D1D5DB; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;">
                    Rechazar
                </button>
                <button onclick="iniciarCronometroDesdeModal()" 
                        style="padding: 14px; background: ${colorPrincipal}; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;">
                    Aceptar Viaje
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    calculoActual = resultado;
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalRapido();
        }
    });
}

function iniciarCronometroDesdeModal() {
    if (calculoActual) {
        iniciarCronometroConViaje(calculoActual);
        cerrarModalRapido();
    }
}

// =============================================
// 7. FUNCIONES DE PROCESAMIENTO DE VIAJES
// =============================================

function procesarViajeRapido(aceptado) {
    console.log('⚡ Procesando viaje rápido:', { aceptado, Actual: !!Actual });
    
    if (!Actual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    cerrarModalRapido();
    
    const viajeParaHistorial = {
        ...Actual,
        aceptado: aceptado,
        rentable: aceptado ? (Actual.rentabilidad === 'rentable') : false,
        emoji: aceptado ? Actual.emoji : '❌',
        texto: aceptado ? Actual.texto : 'RECHAZADO'
    };
    
    agregarAlHistorial(viajeParaHistorial);
    
    if (aceptado) {
        mostrarMensaje('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarMensaje('❌ Viaje rechazado', 'info');
        limpiarFormulario();
    }
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
}

async function agregarAlHistorial(viaje) {
    console.log('➕ agregarAlHistorial() llamado');
    
    if (!viaje || (!viaje.tarifa && !viaje.ganancia)) {
        console.error('❌ Error: Viaje sin datos esenciales');
        return;
    }

    let rentabilidad, emoji, texto;
    
    if (viaje.aceptado === false) {
        rentabilidad = 'rechazado';
        emoji = '🚫';
        texto = 'RECHAZADO';
    } else if (viaje.rentabilidad) {
        rentabilidad = viaje.rentabilidad;
        emoji = viaje.emoji;
        texto = viaje.texto;
    } else if (perfilActual) {
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
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre
    };

    historial.unshift(nuevoViaje);
    
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    if (nuevoViaje.aceptado !== false) {
        guardarDatos();
        
        if (firebaseSync && firebaseSync.initialized && nuevoViaje.aceptado) {
            try {
                await firebaseSync.saveTrip(nuevoViaje);
            } catch (error) {
                console.error('❌ Error sincronizando con Firebase:', error);
            }
        }
    }
    
    actualizarHistorialConFiltros();
    actualizarEstadisticas();
}

function actualizarHistorialConFiltros() {
    if (!elementos['history-list']) return;

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
    
    elementos['history-list'].innerHTML = viajesFiltrados.map((viaje) => {
        const ganancia = viaje.ganancia || viaje.tarifa || 0;
        const minutos = viaje.minutos ? parseFloat(viaje.minutos).toFixed(1) : '0.0';
        const distancia = viaje.distancia || 0;
        const porMinuto = viaje.porMinuto || viaje.gananciaPorMinuto || 0;
        const porKm = viaje.porKm || viaje.gananciaPorKm || 0;
        const esAceptado = viaje.aceptado !== false;
        const esRentable = esAceptado ? (viaje.rentable !== undefined ? Boolean(viaje.rentable) : (viaje.rentabilidad === 'rentable')) : false;
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
                    <button onclick="eliminarDelHistorial('${viaje.id}')" class="delete-btn" title="Eliminar">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

async function eliminarDelHistorial(viajeId) {
    const index = historial.findIndex(viaje => viaje.id === viajeId);
    
    if (index === -1) {
        mostrarError('No se pudo encontrar el viaje para eliminar');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este viaje del historial?')) {
        historial.splice(index, 1);
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        if (firebaseSync && firebaseSync.initialized) {
            try {
                const tripRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips').doc(viajeId);
                await tripRef.delete();
            } catch (error) {
                console.error('❌ Error sincronizando eliminación:', error);
            }
        }
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        mostrarStatus('✅ Viaje eliminado', 'success');
    }
}

async function limpiarHistorialCompleto() {
    if (historial.length === 0) {
        mostrarMensaje('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres limpiar TODO el historial?\n\nSe eliminarán ${historial.length} viajes.\n\n⚠️ Esta acción NO se puede deshacer.`)) {
        historial = [];
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        mostrarMensaje(`✅ Historial limpiado correctamente`, 'success');
    }
}

// =============================================
// 8. FUNCIONES DE ESTADÍSTICAS
// =============================================

function actualizarEstadisticas() {
    if (!elementos['stats-viajes'] || !elementos['stats-ganancia']) return;
    
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
    
    if (elementos['stats-viajes']) elementos['stats-viajes'].textContent = totalViajes;
    if (elementos['stats-ganancia']) elementos['stats-ganancia'].textContent = formatearMoneda(gananciaTotal);
    if (elementos['stats-tiempo']) elementos['stats-tiempo'].textContent = `${tiempoTotal}min`;
    if (elementos['stats-rentables']) elementos['stats-rentables'].textContent = viajesRentables;
}

// =============================================
// 9. FUNCIONES DE PERFILES
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
        document.getElementById('umbral-minuto-rentable').value = perfil.umbralMinutoRentable || 6.00;
        document.getElementById('umbral-km-rentable').value = perfil.umbralKmRentable || 25.00;
        document.getElementById('umbral-minuto-oportunidad').value = perfil.umbralMinutoOportunidad || 5.00;
        document.getElementById('umbral-km-oportunidad').value = perfil.umbralKmOportunidad || 23.00;
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
                    <span class="button-icon">🚗</span> Usar
                </button>
                <button class="secondary-button small" onclick="editarPerfil('${perfil.id}')">
                    <span class="button-icon">✏️</span> Editar
                </button>
                <button class="secondary-button small" onclick="eliminarPerfil('${perfil.id}')">
                    <span class="button-icon">🗑️</span> Eliminar
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
// 10. SISTEMA DE CRONÓMETRO
// =============================================

function actualizarCronometro() {
    if (!cronometro.activo) return;

    cronometro.tiempoTranscurridoSegundos = Math.floor((Date.now() - cronometro.inicio) / 1000);
    const minutosTranscurridos = cronometro.tiempoTranscurridoSegundos / 60;
    
    const minutos = Math.floor(minutosTranscurridos);
    const segundos = cronometro.tiempoTranscurridoSegundos % 60;
    const tiempoFormateado = `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    
    const tiempoDisplay = document.getElementById('cronometro-tiempo-display');
    if (tiempoDisplay) {
        tiempoDisplay.textContent = tiempoFormateado;
    }
    
    actualizarColoresProgreso(minutosTranscurridos);
    actualizarBarraProgreso(minutosTranscurridos);
}

function actualizarColoresProgreso(minutosTranscurridos) {
    const modal = document.getElementById('modal-cronometro');
    if (!modal || !cronometro.viajeActual) return;
    
    const { tiempoBase, tiempoMaximo } = cronometro.viajeActual;
    
    const modalContenido = modal.querySelector('.modal-cronometro-contenido');
    if (!modalContenido) return;
    
    if (minutosTranscurridos <= tiempoBase) {
        modalContenido.className = 'modal-cronometro-contenido estado-verde';
    } else if (minutosTranscurridos <= tiempoMaximo) {
        modalContenido.className = 'modal-cronometro-contenido estado-amarillo';
    } else {
        modalContenido.className = 'modal-cronometro-contenido estado-rojo';
    }
}

function actualizarBarraProgreso(minutosTranscurridos) {
    const progresoFill = document.getElementById('progreso-fill');
    if (!progresoFill || !cronometro.viajeActual) return;
    
    const { tiempoMaximo } = cronometro.viajeActual;
    const porcentaje = Math.min(100, (minutosTranscurridos / tiempoMaximo) * 100);
    
    progresoFill.style.width = `${porcentaje}%`;
}

function crearModalCronometro(resultado) {
    const modalExistente = document.getElementById('modal-cronometro');
    if (modalExistente) modalExistente.remove();

    const modalFondo = document.createElement('div');
    modalFondo.id = 'modal-cronometro';
    modalFondo.className = 'modal-cronometro-fondo';
    
    const tiempoUsuario = resultado.minutos;
    const tiempoAjustado = resultado.tiempoAjustado || resultado.minutos;
    const tiempoTotal = Math.max(tiempoUsuario, tiempoAjustado);
    
    const porcentajeUsuario = (tiempoUsuario / tiempoTotal) * 100;
    const porcentajeAjustado = (tiempoAjustado / tiempoTotal) * 100;
    
    modalFondo.innerHTML = `
        <div class="modal-cronometro-contenido estado-verde">
            <div class="cronometro-header">
                <div class="cronometro-titulo">
                    <span class="cronometro-icono">🚗</span>
                    <span>Viaje en Curso</span>
                </div>
                <div class="cronometro-tiempo-display" id="cronometro-tiempo-display">00:00</div>
                <div class="espera-display" id="espera-display">
                    <span class="espera-estado" id="espera-estado">Esperando al usuario</span>
                    <span class="espera-tiempo" id="espera-tiempo">02:00</span>
                </div>
            </div>
            
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
              
            <div class="cronometro-acciones">
                <button class="btn-espera" id="btn-espera" onclick="manejarEspera()">
                    <span class="btn-icono">⏸️</span>
                    <span class="btn-texto">Iniciar Espera (2 min)</span>
                </button>
                <button class="btn-detener-viaje" onclick="detenerCronometro()">
                    <span class="btn-icono">🛑</span>
                    <span class="btn-texto">Finalizar Viaje</span>
                </button>
                <div class="info-extra-cobro" id="info-extra-cobro">Extra acumulado: $0.00</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalFondo);
}

function iniciarCronometroConViaje(resultado) {
    if (cronometro.activo) {
        console.log('⏱️ Cronómetro ya activo');
        return;
    }

    cerrarModalRapido();

    const tiempoUsuario = parseFloat(elementos.minutos.value) || resultado.minutos;
    const tiempoAjustado = resultado.tiempoAjustado || resultado.minutos;
    const tiempoTotal = Math.max(tiempoUsuario, tiempoAjustado);

    cronometro.viajeActual = {
        ...resultado,
        timestampInicio: new Date().toISOString(),
        tiempoEstimado: tiempoUsuario,
        tiempoAjustado: tiempoAjustado,
        tiempoBase: tiempoUsuario,
        tiempoMaximo: tiempoTotal
    };

    cronometro.activo = true;
    cronometro.inicio = Date.now();
    cronometro.tiempoTranscurridoSegundos = 0;

    crearModalCronometro({
        ...resultado,
        minutos: tiempoUsuario,
        tiempoAjustado: tiempoAjustado
    });
    
    cronometro.intervalo = setInterval(actualizarCronometro, 1000);
    mostrarStatus('⏱️ Viaje iniciado', 'info');
}

function detenerCronometro() {
    if (!cronometro.activo) return;

    clearInterval(cronometro.intervalo);
    
    const tiempoExtra = cronometro.viajeActual?.tiempoExtraCobradoSegundos || 0;
    const tiempoTotalSegundos = cronometro.tiempoTranscurridoSegundos + tiempoExtra;
    const tiempoRealMinutos = tiempoTotalSegundos / 60;
    
    const minutosExtra = tiempoExtra / 60;
    const montoExtraCobrado = minutosExtra * TARIFA_EXTRA_POR_MINUTO;
    const tarifaBase = parseFloat(cronometro.viajeActual.tarifa) || 0;
    const gananciaTotalFinal = tarifaBase + montoExtraCobrado;
    
    if (!cronometro.viajeActual) return;

    const viajeConTiempoReal = {
        tarifa: gananciaTotalFinal,
        ganancia: gananciaTotalFinal,
        distancia: cronometro.viajeActual.distancia || 1,
        tiempoReal: tiempoRealMinutos,
        tiempoEstimado: cronometro.viajeActual.tiempoEstimado,
        diferenciaTiempo: tiempoRealMinutos - cronometro.viajeActual.tiempoEstimado,
        tiempoExtraCobradoSegundos: tiempoExtra,
        montoExtraCobrado: montoExtraCobrado.toFixed(2),
        rentabilidadOriginal: cronometro.viajeActual.rentabilidad,
        textoOriginal: cronometro.viajeActual.texto,
        timestampFin: new Date().toISOString(),
        tiempoRealCapturado: true,
        tarifaBase: tarifaBase,
        extras: montoExtraCobrado,
        gananciaTotal: gananciaTotalFinal
    };

    procesarViajeConTiempoReal(viajeConTiempoReal);

    const modalCronometro = document.getElementById('modal-cronometro');
    if (modalCronometro) modalCronometro.remove();

    limpiarFormularioCompleto();
    
    cronometro.activo = false;
    cronometro.inicio = null;
    cronometro.tiempoTranscurridoSegundos = 0;
    cronometro.viajeActual = null;
}

function procesarViajeConTiempoReal(viajeConTiempoReal) {
    if (!perfilActual) return;
    
    const viajeFinal = {
        id: 'viaje_real_' + Date.now(),
        tarifa: viajeConTiempoReal.gananciaTotal,
        ganancia: viajeConTiempoReal.gananciaTotal,
        distancia: viajeConTiempoReal.distancia,
        minutos: viajeConTiempoReal.tiempoReal,
        rentabilidad: 'rentable',
        rentable: true,
        emoji: '✅',
        texto: 'RENTABLE',
        gananciaPorMinuto: viajeConTiempoReal.gananciaTotal / viajeConTiempoReal.tiempoReal,
        gananciaPorKm: viajeConTiempoReal.gananciaTotal / viajeConTiempoReal.distancia,
        tiempoRealCapturado: true,
        tiempoReal: viajeConTiempoReal.tiempoReal,
        tiempoEstimado: viajeConTiempoReal.tiempoEstimado,
        diferenciaConEstimado: viajeConTiempoReal.diferenciaTiempo,
        fecha: new Date().toLocaleString('es-DO'),
        timestamp: new Date().toISOString(),
        aceptado: true,
        perfilId: perfilActual.id,
        perfilNombre: perfilActual.nombre,
        tiempoExtraCobradoSegundos: viajeConTiempoReal.tiempoExtraCobradoSegundos,
        montoExtraCobrado: viajeConTiempoReal.montoExtraCobrado,
        tarifaBase: viajeConTiempoReal.tarifaBase,
        extras: viajeConTiempoReal.extras,
        gananciaTotal: viajeConTiempoReal.gananciaTotal
    };

    agregarAlHistorialDirecto(viajeFinal);
}

function agregarAlHistorialDirecto(viaje) {
    if (viaje.extras > 0) {
        mostrarStatus(`💰 ¡Se agregaron $${viaje.extras.toFixed(2)} en extras por tiempo de espera!`, 'success');
    }
    
    historial.unshift(viaje);
    
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    guardarDatos();
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
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

    clearInterval(cronometro.intervalo);
    cronometro.activo = false;
    
    if (cronometro.inicio) {
        cronometro.tiempoTranscurridoSegundos = Math.floor((Date.now() - cronometro.inicio) / 1000);
        cronometro.inicio = null;
    }

    cronometro.esperaActiva = true;
    cronometro.estadoEspera = 'countdown';
    cronometro.inicioEspera = Date.now();
    cronometro.tiempoExtraCobradoSegundos = cronometro.viajeActual?.tiempoExtraCobradoSegundos || 0;
    
    cronometro.intervaloEspera = setInterval(actualizarEspera, 1000);

    const btn = document.getElementById('btn-espera');
    if (btn) {
        btn.innerHTML = '<span class="btn-icono">▶️</span> <span class="btn-texto">Detener Espera</span>';
        btn.classList.add('btn-espera-active');
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
        cronometro.estadoEspera = 'countdown';
        if (displayTiempo) displayTiempo.textContent = formatearTiempo(tiempoRestante);
        if (displayEstado) displayEstado.textContent = 'Tiempo de Gracia (2 min)';
        if (displayModal) {
            displayModal.classList.remove('estado-rojo', 'estado-verde');
            displayModal.classList.add('estado-amarillo');
        }
    } else {
        cronometro.estadoEspera = 'cobro_extra';
        
        const tiempoCobroSegundos = tiempoTranscurridoEspera - TIEMPO_ESPERA_GRATIS_SEGUNDOS;
        cronometro.tiempoExtraCobradoSegundos = tiempoCobroSegundos;
        
        if (cronometro.viajeActual) {
            cronometro.viajeActual.tiempoExtraCobradoSegundos = tiempoCobroSegundos;
        }
        
        if (displayTiempo) displayTiempo.textContent = formatearTiempo(tiempoCobroSegundos);
        if (displayEstado) displayEstado.textContent = 'Cobro Extra por Minuto';
        if (displayModal) {
            displayModal.classList.remove('estado-amarillo', 'estado-verde');
            displayModal.classList.add('estado-rojo');
        }
        
        actualizarDisplayCobroExtra();
    }
}

function detenerEspera() {
    if (!cronometro.esperaActiva) return;

    clearInterval(cronometro.intervaloEspera);
    cronometro.esperaActiva = false;
    cronometro.estadoEspera = 'detenido';

    if (cronometro.viajeActual) {
        cronometro.viajeActual.tiempoExtraCobradoSegundos = cronometro.tiempoExtraCobradoSegundos;
    }
    
    cronometro.activo = true;
    
    const tiempoContadoMs = cronometro.tiempoTranscurridoSegundos * 1000;
    cronometro.inicio = Date.now() - tiempoContadoMs;
    cronometro.intervalo = setInterval(actualizarCronometro, 1000);

    const btn = document.getElementById('btn-espera');
    if (btn) {
        btn.innerHTML = '<span class="btn-icono">⏸️</span> <span class="btn-texto">Reanudar Espera</span>';
        btn.classList.remove('btn-espera-active');
    }
}

function actualizarDisplayCobroExtra() {
    const displayCobro = document.getElementById('info-extra-cobro');
    if (displayCobro) { 
        const tiempoExtra = cronometro.tiempoExtraCobradoSegundos || 0; 
        const minutosExtra = tiempoExtra / 60;
        const montoExtra = minutosExtra * TARIFA_EXTRA_POR_MINUTO;
        const montoFormateado = formatearMoneda(montoExtra);
        displayCobro.textContent = `Cobro Extra acumulado: ${montoFormateado} (${minutosExtra.toFixed(1)} min)`;
    }
}

// =============================================
// 11. SISTEMA DE TRÁFICO (CLASE)
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
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps no está disponible');
        }

        try {
            const mapContainer = document.createElement('div');
            mapContainer.style.cssText = 'position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
            document.body.appendChild(mapContainer);

            const defaultPosition = { lat: 18.4861, lng: -69.9312 };

            this.map = new google.maps.Map(mapContainer, {
                zoom: 12,
                center: defaultPosition,
                disableDefaultUI: true,
                zoomControl: false,
                gestureHandling: 'none'
            });

            this.trafficLayer = new google.maps.TrafficLayer();
            this.trafficLayer.setMap(this.map);
            this.initialized = true;
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando Google Maps:', error);
            this.initialized = false;
            throw error;
        }
    }

    async getCurrentLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
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
                    if (this.map) this.map.setCenter(this.currentLocation);
                    resolve(this.currentLocation);
                },
                () => {
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

    async analyzeTrafficInRadius() {
        if (!this.initialized) throw new Error('Sistema de tráfico no inicializado');
        if (!this.currentLocation) await this.getCurrentLocation();

        const trafficData = await this.getTrafficData();
        return this.calculateTrafficImpact(trafficData);
    }

    async getTrafficData() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const trafficCondition = this.estimateTrafficFromConditions();
                resolve(trafficCondition);
            }, 500);
        });
    }

    estimateTrafficFromConditions() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        
        let condition, factor, confidence;

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
            message: this.getTrafficMessage(condition)
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
        
        if (baseTime <= 0) {
            return {
                originalTime: 0,
                adjustedTime: 0,
                trafficCondition: 'unknown',
                adjustment: 0,
                message: 'Ingresa el tiempo estimado primero'
            };
        }

        let factorLimitado = trafficData.trafficFactor;
        
        if (baseTime <= 15) {
            factorLimitado = Math.min(factorLimitado, 1.15);
        } else if (baseTime <= 30) {
            factorLimitado = Math.min(factorLimitado, 1.3);
        }

        const adjustedTime = Math.ceil(baseTime * factorLimitado);

        return {
            originalTime: baseTime,
            adjustedTime: adjustedTime,
            trafficCondition: trafficData.condition,
            trafficFactor: factorLimitado,
            adjustment: Math.round((factorLimitado - 1) * 100),
            confidence: trafficData.confidence,
            message: trafficData.message,
            location: trafficData.location
        };
    }

    getConservativeEstimate() {
        const baseTime = parseFloat(elementos.minutos?.value) || 0;
        const adjustedTime = Math.ceil(baseTime * 1.15);
        
        return {
            originalTime: baseTime,
            adjustedTime: adjustedTime,
            trafficCondition: 'unknown',
            adjustment: 15,
            confidence: 0.5,
            message: 'Estimación conservadora (sin datos en tiempo real)'
        };
    }
}

// =============================================
// 12. SISTEMA DE SINCRONIZACIÓN (CLASE)
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
            if (typeof firebase === 'undefined') throw new Error('Firebase no está cargado');
            
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.userId = userCodeSystem.userId;
            this.initialized = true;
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
            return true;
        } catch (error) {
            console.error('❌ Error guardando perfil:', error);
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
            return true;
        } catch (error) {
            console.error('❌ Error guardando viaje:', error);
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
                snapshot.forEach(doc => profiles.push(doc.data()));
                return profiles;
            }
            return [];
        } catch (error) {
            console.error('❌ Error cargando perfiles:', error);
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
                snapshot.forEach(doc => trips.push(doc.data()));
                return trips;
            }
            return [];
        } catch (error) {
            console.error('❌ Error cargando viajes:', error);
            return null;
        }
    }
}

// =============================================
// 13. SISTEMA DE CÓDIGO DE USUARIO
// =============================================

async function initializeUserCodeSystem() {
    const savedCode = localStorage.getItem('DIBER_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
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
    if (!headerLeft) return;
    
    let codeButton = document.getElementById('user-code-button');
    
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
        `;
        headerLeft.appendChild(codeButton);
    }
    
    if (userCodeSystem.userCode) {
        codeButton.innerHTML = `<span class="button-icon">🔑</span>`;
        codeButton.title = 'Código de sincronización: ' + userCodeSystem.userCode;
        codeButton.style.display = 'flex';
        codeButton.onclick = mostrarInfoUserCode;
    }
}

function mostrarInfoUserCode() {
    if (userCodeSystem.userCode) {
        mostrarStatus(`🔑 Código: ${userCodeSystem.userCode} - Haz clic para cambiar`, 'info');
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

function hideUserCodeBanner() {
    const codeButton = document.getElementById('user-code-button');
    if (codeButton) codeButton.style.display = 'none';
}

// =============================================
// 14. FUNCIONES DE SINCRONIZACIÓN Y DATOS
// =============================================

async function initializeFirebaseSync() {
    if (firebaseInitialized && firebaseSync && firebaseSync.initialized) return true;
    
    firebaseSync = new FirebaseSync();
    const success = await firebaseSync.initialize();
    
    if (success) {
        firebaseInitialized = true;
        if (!loadingData) {
            setTimeout(async () => await cargarDatos(), 1000);
        }
        return true;
    } else {
        firebaseInitialized = false;
        return false;
    }
}

async function cargarDatos() {
    if (loadingData) return;
    loadingData = true;
    
    try {
        const historialGuardado = localStorage.getItem('historialViajes');
        if (historialGuardado) {
            historial = JSON.parse(historialGuardado);
        }
        
        const datosGuardados = localStorage.getItem('DIBER_data');
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            perfiles = datos.perfiles || [];
            perfilActual = datos.perfilActual || null;
        }

        if (firebaseSync && firebaseSync.initialized) {
            try {
                const cloudProfiles = await firebaseSync.loadProfiles();
                if (cloudProfiles && cloudProfiles.length > 0) {
                    const perfilesUnicos = [...perfiles];
                    cloudProfiles.forEach(cloudProfile => {
                        const exists = perfilesUnicos.some(localProfile => localProfile.id === cloudProfile.id);
                        if (!exists) perfilesUnicos.push(cloudProfile);
                    });
                    perfiles = perfilesUnicos;
                }
                
                const cloudTrips = await firebaseSync.loadTrips();
                if (cloudTrips && cloudTrips.length > 0) {
                    const historialCombinado = [...historial];
                    cloudTrips.forEach(cloudTrip => {
                        const exists = historialCombinado.some(localTrip => localTrip.id === cloudTrip.id);
                        if (!exists) historialCombinado.push(cloudTrip);
                    });
                    historial = historialCombinado
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 100);
                    localStorage.setItem('historialViajes', JSON.stringify(historial));
                }
            } catch (error) {
                console.error('❌ Error cargando Firebase:', error);
            }
        }

        if (!perfilActual && perfiles.length > 0) {
            perfilActual = perfiles[0];
        }

        actualizarInterfazPerfiles();
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
    } finally {
        loadingData = false;
    }
}

async function guardarDatos() {
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    localStorage.setItem('DIBER_data', JSON.stringify({
        perfiles, perfilActual, historial, version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));

    if (firebaseSync && firebaseSync.initialized) {
        try {
            for (const perfil of perfiles) {
                await firebaseSync.saveProfile(perfil);
            }
            const viajesParaSincronizar = historial.filter(item => item.aceptado).slice(0, 50);
            for (const viaje of viajesParaSincronizar) {
                await firebaseSync.saveTrip(viaje);
            }
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
        }
    }
}

// =============================================
// 15. INICIALIZACIÓN DE ELEMENTOS DOM Y EVENTOS
// =============================================

function inicializarElementosDOM() {
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
        'user-code-modal', 'user-code-input'
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
    });

    elementos.tabButtons = document.querySelectorAll('.tab-button');
    elementos.tabContents = document.querySelectorAll('.tab-content');
}

function inicializarTabs() {
    if (!elementos.tabButtons || elementos.tabButtons.length === 0) return;
    
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            cambiarPestana(tabId);
        });
    });
}

function configurarEventListeners() {
    inicializarTabs();
    
    if (elementos.tarifa) elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    if (elementos.minutos) elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    if (elementos.distancia) elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    
    if (elementos['clear-history']) elementos['clear-history'].addEventListener('click', limpiarHistorialCompleto);
    if (elementos['nuevo-perfil-btn']) elementos['nuevo-perfil-btn'].addEventListener('click', () => mostrarConfigPerfil());
    if (elementos['volver-perfiles']) elementos['volver-perfiles'].addEventListener('click', () => mostrarPantalla('perfil'));
    if (elementos['cancelar-perfil']) elementos['cancelar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    if (elementos['cambiar-perfil']) elementos['cambiar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    if (elementos['perfil-form']) elementos['perfil-form'].addEventListener('submit', guardarPerfil);
    if (elementos['theme-toggle']) elementos['theme-toggle'].addEventListener('click', alternarTema);
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cambiarFiltroHistorial(btn.dataset.filtro);
        });
    });
}

function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('DIBER_theme', newTheme);
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('DIBER_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

async function inicializarSistemaTraficoCompleto() {
    try {
        if (!window.google || !window.google.maps) {
            throw new Error('Google Maps no está disponible');
        }
        
        realTimeTraffic = new RealTimeTrafficSystem();
        await realTimeTraffic.initializeGoogleMaps();
        await realTimeTraffic.getCurrentLocation();
        return true;
    } catch (error) {
        console.error('❌ Error inicializando sistema de tráfico:', error);
        realTimeTraffic = null;
        return false;
    }
}

// =============================================
// 16. INICIALIZACIÓN PRINCIPAL
// =============================================

async function inicializarApp() {
    if (window.appInitialized) return;
    
    inicializarElementosDOM();
    
    try {
        const userCodeInitialized = await initializeUserCodeSystem();
        if (!userCodeInitialized) return;

        try {
            await loadGoogleMaps();
            await inicializarSistemaTraficoCompleto();
        } catch (error) {
            console.log('⚠️ Google Maps no disponible, usando modo local');
        }
        
        await initializeFirebaseSync();
        await cargarDatos();
        
        aplicarTemaGuardado();
        configurarEventListeners();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
        } else {
            mostrarPantalla('perfil');
        }
        
        window.appInitialized = true;
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarStatus('❌ Error al iniciar. Recarga la página.', 'error');
    }
}

// =============================================
// 17. FUNCIONES GLOBALES EXPUESTAS
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
window.procesarViajeRapido = procesarViajeRapido;
window.iniciarCronometroDesdeModal = iniciarCronometroDesdeModal;
window.manejarEspera = manejarEspera;
window.detenerCronometro = detenerCronometro;

// =============================================
// 18. EJECUCIÓN PRINCIPAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
});

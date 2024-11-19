//Volver atras
function pagina_correlacion() {
    window.location.href = '/templates/analisis.html';
}

function transicionPrediccion() {
    document.getElementById('transicionP').classList.add('slide-in-left');
}

//Pagina conversaciones
function pagina_conversaciones() {
    window.location.href = '/templates/conversaciones.html';
}

//Pagina evaluar
function openCustomModal(url) {
    // Agrega el efecto difuminado al fondo
    document.getElementById('index').classList.add('blur-background-custom');

    // Muestra el overlay y carga la nueva página en el iframe
    document.getElementById('custom-modal-overlay').style.display = 'flex';
    document.getElementById('custom-modal-iframe').src = url;
}

function closeCustomModal() {
    // Remueve el efecto difuminado del fondo
    document.getElementById('index').classList.remove('blur-background-custom');

    // Oculta el overlay y limpia el src del iframe
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.getElementById('custom-modal-iframe').src = '';

    // Actualizar numero de alumnos evaluados
    updateEvaluacionStatus();
}

async function caracteristicas() {
    fetch('/api/obtener_caracteristicas')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if(data.hayResultados == 1 || data.hayEvaluacion == 1){
                const selectCaracteristicas = data.caracteristicas;
                const selectElement = document.getElementById('select-caracteristicas');
                selectCaracteristicas.forEach(caract => {
                    const option = document.createElement('option');
                    option.value = caract;
                    option.textContent = caract;
                    selectElement.appendChild(option);
                });
            }
            const selectEtiqueta = data.etiquetas;
            const selectElement2 = document.getElementById('select-etiqueta');
            selectEtiqueta.forEach(caract => {
                const option = document.createElement('option');
                option.value = caract;
                option.textContent = caract;
                selectElement2.appendChild(option);
            });
        })
        .catch(error => console.error('Error al establecer las características:', error));
}


async function enviarDatos() {
    const metodo = document.querySelector("#select-entrenamiento").value;
    const caracteristicas = Array.from(document.querySelector("#select-caracteristicas").selectedOptions).map(option => option.value);
    const etiqueta = document.querySelector("#select-etiqueta").value;
    const porcentaje_prueba = document.querySelector("#input").value;

    // Verificar si caracteristicas está vacío
    if (caracteristicas.length === 0) {
        alert("Por favor, selecciona al menos una característica.");
        return;  // Detener la ejecución si no hay características seleccionadas
    }

    const datos = {
        metodo: metodo,
        caracteristicas: caracteristicas,
        etiqueta: etiqueta,
        porcentaje_prueba: Math.round(parseFloat(porcentaje_prueba))
    };

    console.log(datos);

    await fetch('/api/entrenar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);
            const selectedMetodo = data.metodo;
            const selectedCaracteristicas = data.caracteristicas.join(', ');
            const selectedEtiqueta = data.etiqueta;
            const selectedPorcentaje = data.porcentaje_prueba;
            const accuracy = data.accuracy;

            // Crear un nuevo div para los resultados
            const newResultDiv = document.createElement('div');
            newResultDiv.classList.add('results-container');
            newResultDiv.id = `results-${Date.now()}`;  // Asignar un ID único
            newResultDiv.innerHTML = `
                    <h2><u>Resultados de testeo/evaluación</u></h2>
                    <p><strong>Método:</strong> <span>${selectedMetodo}</span></p>
                    <p><strong>Características seleccionadas:</strong> <span>${selectedCaracteristicas}</span></p>
                    <p><strong>Etiqueta seleccionada:</strong> <span>${selectedEtiqueta}</span></p>
                    <p><strong>Porcentaje de prueba:</strong> <span>${selectedPorcentaje}</span>%</p>
                    <p><strong>RMSE (Raíz del Error Cuadrático Medio):</strong> <span>${accuracy}</span></p>
                    <div class="boton-predecir">
                    <button class="bg-black text-xl p-2 rounded w-full text-white" id="predecir-button" onclick="mostrarFormularioPrediccion('${selectedCaracteristicas}', '${selectedMetodo}', '${selectedEtiqueta}', '${selectedPorcentaje}', '${newResultDiv.id}')">Predecir</button>
                    </div>
                `;

            // Añadir el nuevo div al principio del contenedor de resultados
            const allResults = document.getElementById('all-results');
            
            allResults.insertBefore(newResultDiv, allResults.firstChild);
            
            // Desplazar el contenedor hacia el final
            document.getElementById('analisis').scrollTo({
                top: 165,
                behavior: 'smooth'
            });
        })
        .catch(error => {
            console.error("Error:", error);
        });
}

// Variables globales para almacenar los parámetros
    let globalCaracteristicas = '';
    let globalMetodo = '';
    let globalEtiqueta = '';
    let globalPorcentaje = '';
    let globalResultadoId = '';
    let datosAlumnosParaPredecir = {};
    let atribCalculados = 0;
    let chatsEvaluados = 0;
    let necesitaEvaluar = false;

function mostrarFormularioPrediccion(caracteristicas, metodo, etiqueta, porcentaje, resultadoId) {
    // Guardar los parámetros en las variables globales
    globalMetodo = metodo;
    globalEtiqueta = etiqueta;
    globalPorcentaje = porcentaje;
    globalResultadoId = resultadoId;

    // Dividir las características
    const caracteristicasArray = caracteristicas.split(', ');

    // Verificar si hay que calcular caracteristicas mediante ia
    const necesitaValoresIA = caracteristicasArray.some(caracteristica => 
        caracteristica === '(IA) - % Relación con la asignatura' || caracteristica === '(IA) - % Conocimiento sobre la asignatura'
    );

    // Verificar si hay que evaluar 
    necesitaEvaluar = caracteristicasArray.some(caracteristica => 
        caracteristica === '% Relación con la asignatura' || caracteristica === '% Conocimiento sobre la asignatura'
    );

    // Comprobar si el objeto no está vacío
    if (Object.keys(datosAlumnosParaPredecir).length > 0) {
        if(necesitaValoresIA) { 
            if (atribCalculados === 1) {
                // Cambiar el vector de características
                datosAlumnosParaPredecir.caracteristicas = caracteristicasArray;
                document.getElementById("button-aceptar").classList.remove('boton-disabled');
            } else {
                document.getElementById("button-aceptar").classList.add('boton-disabled');
            }
        } else {
            // Cambiar el vector de características
            datosAlumnosParaPredecir.caracteristicas = caracteristicasArray;
            document.getElementById("button-aceptar").classList.remove('boton-disabled');
        }
    }

    // Mostrar el modal
    document.getElementById('prediccionModal').style.display = 'block';

    const form = document.getElementById('upload-form');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const resultDiv = document.getElementById('result');
        const errorDiv = document.getElementById('error');

        try {
            // Realizar la solicitud a la API
            const response = await fetch('/api/upload-zip-prediction', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (response.ok && !data.isUploadDirEmpty) {
                

                // Solicitar los datos de los chats de los alumnos
                const responseDatos = await fetch('/api/obtener-datos-chats');
                const datos = await responseDatos.json();

                if (responseDatos.ok) {
                    // Filtrar los datos de cada alumno según las características seleccionadas
                    datosAlumnosParaPredecir = {
                        filename: datos.filename,
                        promedio_mensajes: datos.promedio_mensajes,
                        longitud_promedio: datos.longitud_promedio,
                        dispersion_promedio: datos.dispersion_promedio,
                        caracteristicas: caracteristicasArray
                    };

                    atribCalculados = 0;

                    console.log("Datos filtrados de alumnos:", datosAlumnosParaPredecir);

                    if (necesitaValoresIA) {
                         // Mostrar el indicador de carga
                        var loadingIndicator = document.getElementById('loading-indicator');
                        loadingIndicator.style.display = 'block';
                        try {
                            const responseIA = await fetch('/api/obtener_valores_ia');
                            const datosIA = await responseIA.json();

                            if (responseIA.ok) {
                                const valoresIA = datosIA.IA
                                datosAlumnosParaPredecir = {
                                    ...datosAlumnosParaPredecir,
                                    relacion: datosIA.relacion,
                                    conocimiento: datosIA.conocimiento
                                };
                                atribCalculados = 1;
                                resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
                                errorDiv.style.display = 'none';
                                errorDiv.textContent = '';
                                console.log("Datos de IA obtenidos:", datosAlumnosParaPredecir);
                                // Habilitar boton
                                document.getElementById("button-aceptar").classList.remove('boton-disabled');
                            } else {
                                throw new Error('Error al obtener los valores de IA');
                                document.getElementById("button-aceptar").classList.add('boton-disabled');
                                datosAlumnosParaPredecir = {};
                            }
                        } catch (error) {
                            console.error("Error:", error);
                            const errorDiv = document.getElementById('error');
                            errorDiv.textContent = 'Error al obtener los valores de IA';
                            errorDiv.style.display = 'block';
                            document.getElementById("button-aceptar").classList.add('boton-disabled');
                            datosAlumnosParaPredecir = {};
                            return; // Detener ejecución si hay error en la obtención de IA
                        } finally {
                            // Ocultar el indicador de carga
                            loadingIndicator.style.display = 'none';
                        }
                    } else {
                        resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
                        errorDiv.style.display = 'none';
                        errorDiv.textContent = '';
                        // Habilitar boton
                        document.getElementById("button-aceptar").classList.remove('boton-disabled');
                    }

                } else {
                    errorDiv.textContent = 'Error al obtener los datos de los chats de los alumnos.';
                    errorDiv.style.display = 'block';
                    resultDiv.textContent = '';

                    // Deshabilitar boton
                    document.getElementById("button-aceptar").classList.add('boton-disabled');
                    datosAlumnosParaPredecir = {};
                    atribCalculados = 0;
                }
                
            } else {
                errorDiv.textContent = 'Error: No se ha encontrado ningun archivo JSON o la estructura del ZIP es incorrecta';
                errorDiv.style.display = 'block';
                resultDiv.textContent = '';
                // Deshabilitar boton
                document.getElementById("button-aceptar").classList.add('boton-disabled');
                datosAlumnosParaPredecir = {};
            }

        } catch (error) {
            // Manejar cualquier error que ocurra durante la solicitud
            console.error("Error:", error);
            errorDiv.textContent = 'Ha ocurrido un error en la comunicación con el servidor.';
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';
            // Deshabilitar boton
            document.getElementById("button-aceptar").classList.add('boton-disabled');
            datosAlumnosParaPredecir = {};
        }
    });
}

function cerrarFormularioPrediccion() {
    // Ocultar el modal
    document.getElementById('prediccionModal').style.display = 'none';
}

function aceptar() {
    if (necesitaEvaluar){
        openCustomModal('/templates/evaluarParaPredecir.html')
    } else {
        realizarPrediccion();
    }
}

async function realizarPrediccion() {
    const resultados = [];

    // Iteramos sobre cada alumno en `datosAlumnosParaPredecir`
    for (let i = 0; i < datosAlumnosParaPredecir.filename.length; i++) {
        // Obtener el `filename` actual y sus valores correspondientes
        const alumnoFilename = datosAlumnosParaPredecir.filename[i];
        
        // Crear objeto `valores` solo con las características seleccionadas
        const valores = [];
        datosAlumnosParaPredecir.caracteristicas.forEach((caracteristica) => {
            if (caracteristica === "Promedio de mensajes") {
                valores.push(datosAlumnosParaPredecir.promedio_mensajes[i]);
            } else if (caracteristica === "Longitud promedio de mensajes") {
                valores.push(datosAlumnosParaPredecir.longitud_promedio[i]);
            } else if (caracteristica === "Dispersión de los mensajes") {
                valores.push(datosAlumnosParaPredecir.dispersion_promedio[i]);
            } else if (caracteristica === "(IA) - % Relación con la asignatura") {
                valores.push(datosAlumnosParaPredecir.relacion[i]);
            } else if (caracteristica === "(IA) - % Conocimiento sobre la asignatura") {
                valores.push(datosAlumnosParaPredecir.conocimiento[i]);
            }
        });

        // Construir el objeto de datos a enviar para cada alumno
        const datosPrediccion = {
            metodo: globalMetodo,
            caracteristicas: datosAlumnosParaPredecir.caracteristicas,
            etiqueta: globalEtiqueta,
            porcentaje_prueba: globalPorcentaje,
            valores: valores
        };

        // Enviar los datos para la predicción
        try {
            const response = await fetch('/api/predecir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosPrediccion)
            });
            const data = await response.json();

            // Agregar los resultados individuales al arreglo de `resultados`
            resultados.push({
                filename: alumnoFilename,
                prediccion: data.prediccion,
                caracteristicas: data.caracteristicas,
                valores: data.valores
            });
        } catch (error) {
            console.error("Error:", error);
        }
    }

    // Actualizar la interfaz de usuario con todos los resultados de predicción
    const resultDiv = document.getElementById(globalResultadoId);
    if (resultDiv) {
        resultados.forEach(resultado => {
            // Crear un contenedor para cada resultado
            const predictionResultDiv = document.createElement('div');
            predictionResultDiv.className = 'resultado-prediccion'; // Aplicar la clase CSS para el estilo

            // Agregar contenido a la tarjeta
            predictionResultDiv.innerHTML = `
                <h3><strong>${resultado.filename}</strong></h3>
                <ul>
                    ${resultado.caracteristicas.map((caracteristica, index) => `
                        <li>${caracteristica}: ${resultado.valores[index]}</li>
                    `).join('')}
                </ul>
                <p><strong>Resultados de la predicción (${globalEtiqueta}): </strong><span>${resultado.prediccion}</span></p>
            `;
        
            // Añadir la tarjeta al contenedor de resultados
            resultDiv.appendChild(predictionResultDiv);
        });
    }

    // Ocultar el modal
    cerrarFormularioPrediccion();
}

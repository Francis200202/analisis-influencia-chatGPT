// Función para redirigir a la página de correlación
function pagina_correlacion() {
    window.location.href = '/templates/analisis.html';
}

// Función para aplicar una transición de entrada
function transicionPrediccion() {
    document.getElementById('transicionP').classList.add('slide-in-left');
}

// Función para redirigir a la página estadísticas
function pagina_conversaciones() {
    window.location.href = '/templates/conversaciones.html';
}

// Función para mostrar la sección de ayuda y ocultar la sección de predicción
function ayuda() {
    document.getElementById('help-container').style.display = 'block';
    document.getElementById('ayuda_header').style.display = 'block';
    document.getElementById('analisis').style.display = 'none';
    document.getElementById('ayuda-link').style.color = '#abebc6'; // Cambiar color del enlace de ayuda
    document.getElementById('analisisLink').style.color = 'white'; // Restaurar color del enlace de análisis
    document.getElementById('prediccionLink').style.color = 'white'; // Restaurar color del enlace de predicción
}

// Variables globales para almacenar los parámetros
let globalCaracteristicas = ''; // Características seleccionadas
let globalMetodo = ''; // Método de entrenamiento seleccionado
let globalEtiqueta = ''; // Etiqueta seleccionada
let globalPorcentaje = ''; // Porcentaje de prueba
let globalResultadoId = ''; // ID del resultado de la predicción
let datosAlumnosParaPredecir = {}; // Datos de los alumnos para predecir
let atribCalculados = 0; // Indicador de si los atributos han sido calculados
let chatsEvaluados = 0; // Indicador de si los chats han sido evaluados
let necesitaEvaluar = false; // Indicador de si se necesita evaluar
let necesitaValoresIA = false; // Indicador de si se necesitan calcular los atributos mediante IA

// Función para abrir el modal de evaluación
function openCustomModal(url) {
    // Agrega el efecto difuminado al fondo
    document.getElementById('analisis').classList.add('blur-background-custom');
    document.getElementById('header').classList.add('blur-background-custom');

    // Muestra el overlay y carga la nueva página en el iframe
    document.getElementById('custom-modal-overlay').style.display = 'flex';
    document.getElementById('custom-modal-iframe').src = url;
}

// Escuchar mensajes enviados desde el iframe
window.addEventListener("message", (event) => {
    console.log("Mensaje recibido:", event.data);
    // Verificar la acción del mensaje
    if (event.data.action === "updateAcceptButton") {
        const acceptButton = document.getElementById("accept-button");

        // Habilitar o deshabilitar el botón de aceptar según el estado
        if (event.data.state) {
            acceptButton.classList.remove("boton-disabled");
        } else {
            acceptButton.classList.add("boton-disabled");
        }
    }
});

// Función para navegar entre conversaciones en el modal
function navigateModal(direction) {
    const iframe = document.getElementById("custom-modal-iframe");
    // Enviar un mensaje al iframe para seleccionar la anterior o siguiente conversación
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: "navigateConversation", direction }, "*");
    } else {
        console.error("Iframe no encontrado o no accesible.");
    }
}

// Función para cerrar el modal de evaluación
async function closeCustomModal() {
    // Remueve el efecto difuminado del fondo
    document.getElementById('analisis').classList.remove('blur-background-custom');
    document.getElementById('header').classList.remove('blur-background-custom');

    // Oculta el overlay y limpia el src del iframe
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.getElementById('custom-modal-iframe').src = '';
}

// Función para cerrar el modal y realizar una predicción
async function closeCustomModalAndPredict() {
    // Remueve el efecto difuminado del fondo
    document.getElementById('analisis').classList.remove('blur-background-custom');
    document.getElementById('header').classList.remove('blur-background-custom');

    // Oculta el overlay y limpia el src del iframe
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.getElementById('custom-modal-iframe').src = '';

    try {
        // Obtener los valores de evaluación
        const respuesta = await fetch('/api/obtener_evaluacion_predict');
        const datos = await respuesta.json();
        if (respuesta.ok) {
            const valores = datos.eval
            // Actualizar los datos de los alumnos para predecir
            datosAlumnosParaPredecir = {
                ...datosAlumnosParaPredecir,
                relacion: datos.relacion,
                conocimiento: datos.conocimiento
            };
            realizarPrediccion(); // Realizar la predicción
        } else {
            throw new Error('Error al obtener los valores de evaluación');
            datosAlumnosParaPredecir = {}; // Limpiar los datos si hay un error
        }
    } catch (error) {
        console.error('Error al obtener el diccionario:', error);
        return null;
    }
}

// Función para obtener las características y etiquetas
async function caracteristicas() {
    fetch('/api/obtener_caracteristicas')
        .then(response => response.json())
        .then(data => {
            console.log(data);
            // Si hay atributos calculados o evaluaciones, cargar las características
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
            // Cargar las etiquetas
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

// Función para enviar los datos de entrenamiento
async function enviarDatos() {
    const metodo = document.querySelector("#select-entrenamiento").value; // Método seleccionado
    const caracteristicas = Array.from(document.querySelector("#select-caracteristicas").selectedOptions).map(option => option.value); // Características seleccionadas
    const etiqueta = document.querySelector("#select-etiqueta").value; // Etiqueta seleccionada
    const porcentaje_prueba = document.querySelector("#input").value; // Porcentaje de prueba

    // Verificar si se han seleccionado características
    if (caracteristicas.length === 0) {
        alert("Por favor, selecciona al menos una característica.");
        return;  // Detener la ejecución si no hay características seleccionadas
    }

    // Crear el objeto de datos para enviar
    const datos = {
        metodo: metodo,
        caracteristicas: caracteristicas,
        etiqueta: etiqueta,
        porcentaje_prueba: Math.round(parseFloat(porcentaje_prueba))
    };

    console.log(datos);

    // Enviar los datos para entrenar
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
            const selectedMetodo = data.metodo; // Método utilizado
            const selectedCaracteristicas = data.caracteristicas.join(', '); // Características utilizadas
            const selectedEtiqueta = data.etiqueta; // Etiqueta utilizada
            const selectedPorcentaje = data.porcentaje_prueba; // Porcentaje de prueba
            const accuracy = data.accuracy; // Precisión del modelo

            // Crear un nuevo div para mostrar los resultados
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

let abortController; // Guardar el controlador de aborto para cancelar solicitudes anteriores

// Función para mostrar el formulario de predicción
function mostrarFormularioPrediccion(caracteristicas, metodo, etiqueta, porcentaje, resultadoId) {
    console.log(caracteristicas, metodo, etiqueta, porcentaje, resultadoId);
    // Guardar los parámetros en las variables globales
    globalMetodo = metodo;
    globalEtiqueta = etiqueta;
    globalPorcentaje = porcentaje;
    globalResultadoId = resultadoId;

    // Dividir las características
    const caracteristicasArray = caracteristicas.split(', ');



    // Verificar si hay que calcular caracteristicas mediante ia
    necesitaValoresIA = caracteristicasArray.some(caracteristica => 
        caracteristica === '(IA) - % Relación con la asignatura' || caracteristica === '(IA) - % Conocimiento sobre la asignatura'
    );
    console.log(necesitaValoresIA);

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

    // Configurar el formulario
    const form = document.getElementById('upload-form');
    // Eliminar el listener anterior si existe
    form.removeEventListener('submit', uploadform);
    form.addEventListener('submit', (event) => uploadform(event, caracteristicasArray)); // Agregar nuevo listener

    // Mostrar el modal de predicción
    document.getElementById('prediccionModal').style.display = 'block';
}


// Función para manejar la subida del archivo ZIP y procesar los datos
async function uploadform(event, caracteristicasArray) {
    event.preventDefault(); // Evitar el comportamiento predeterminado del formulario

    // Crear un nuevo AbortController para cada solicitud
    if (abortController) {
        abortController.abort(); // Abortar la solicitud anterior si existe
    }
    abortController = new AbortController(); // Crear un nuevo controlador de aborto
    const signal = abortController.signal; // Obtener la señal para pasarla a la solicitud

    const form = document.getElementById('upload-form');
    const formData = new FormData(form); // Crear un objeto FormData con los datos del formulario
    const resultDiv = document.getElementById('result'); // Div para mostrar si los datos se han extraido y calculado correctamente
    const errorDiv = document.getElementById('error'); // Div para mostrar errores

    try {
        // Ocultar errorDiv y resultDiv
        errorDiv.style.display = 'none';
        resultDiv.style.display = 'none';

        // Realizar la solicitud a la API
        const response = await fetch('/api/upload-zip-prediction', {
            method: 'POST',
            body: formData,
            signal: signal // Pasamos la señal de aborto a la solicitud
        });
        const data = await response.json();

        // Verificar si la respuesta es exitosa y si el archivo ZIP no está vacío
        if (response.ok && !data.isUploadDirEmpty) {
            // Solicitar los datos de los chats de los alumnos
            const responseDatos = await fetch('/api/obtener-datos-chats');
            const datos = await responseDatos.json();

            if (responseDatos.ok) {
                // Filtrar los datos de cada alumno según las características seleccionadas
                datosAlumnosParaPredecir = {
                    filename: datos.filename, // Nombres de los archivos
                    promedio_mensajes: datos.promedio_mensajes, // Promedio de mensajes
                    longitud_promedio: datos.longitud_promedio, // Longitud promedio de los mensajes
                    dispersion_promedio: datos.dispersion_promedio, // Dispersión promedio de los mensajes
                    caracteristicas: caracteristicasArray // Características seleccionadas
                };

                atribCalculados = 0; // Reiniciar el indicador de atributos calculados

                console.log("Datos filtrados de alumnos:", datosAlumnosParaPredecir);

                // Verificar si se necesitan calcular los atributos mediante IA
                necesitaValoresIA = caracteristicasArray.some(caracteristica =>
                    caracteristica === '(IA) - % Relación con la asignatura' || caracteristica === '(IA) - % Conocimiento sobre la asignatura'
                );
                console.log("Necesita IA:", necesitaValoresIA);
                if (necesitaValoresIA === true) {
                    console.log("Necesita IA2:", necesitaValoresIA);
                    // Mostrar el indicador de carga
                    var loadingIndicator = document.getElementById('loading-indicator');
                    loadingIndicator.style.display = 'block';
                    try {
                        // Obtener los valores calculados por IA
                        const responseIA = await fetch('/api/obtener_valores_ia');
                        const datosIA = await responseIA.json();

                        if (responseIA.ok) {
                            // Actualizar los datos de los alumnos con los valores de IA
                            datosAlumnosParaPredecir = {
                                ...datosAlumnosParaPredecir,
                                relacionIA: datosIA.relacion, 
                                conocimientoIA: datosIA.conocimiento
                            };
                            atribCalculados = 1; // Indicar que los atributos han sido calculados
                            resultDiv.style.display = 'block';
                            resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
                            errorDiv.style.display = 'none';
                            errorDiv.textContent = '';
                            console.log("Datos de IA obtenidos:", datosAlumnosParaPredecir);
                            // Habilitar el botón de aceptar
                            document.getElementById("button-aceptar").classList.remove('boton-disabled');
                        } else {
                            throw new Error('Error al obtener los valores de IA');
                            document.getElementById("button-aceptar").classList.add('boton-disabled');
                            datosAlumnosParaPredecir = {}; // Limpiar los datos si hay un error
                        }
                    } catch (error) {
                        console.error("Error:", error);
                        const errorDiv = document.getElementById('error');
                        errorDiv.textContent = 'Error al obtener los valores de IA';
                        errorDiv.style.display = 'block';
                        document.getElementById("button-aceptar").classList.add('boton-disabled');
                        datosAlumnosParaPredecir = {}; // Limpiar los datos si hay un error
                    } finally {
                        // Ocultar el indicador de carga
                        loadingIndicator.style.display = 'none';
                    }
                } else {
                    // Mostrar mensaje de éxito si no se necesitan valores de IA
                    resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
                    resultDiv.style.display = 'block';
                    errorDiv.style.display = 'none';
                    errorDiv.textContent = '';
                    // Habilitar el botón de aceptar
                    document.getElementById("button-aceptar").classList.remove('boton-disabled');
                }
                
            } else {
                // Mostrar error si no se pueden obtener los datos de los chats
                errorDiv.textContent = 'Error al obtener los datos de los chats de los alumnos.';
                errorDiv.style.display = 'block';
                resultDiv.textContent = '';

                // Deshabilitar el botón de aceptar
                document.getElementById("button-aceptar").classList.add('boton-disabled');
                datosAlumnosParaPredecir = {}; // Limpiar los datos si hay un error
                atribCalculados = 0; // Reiniciar el indicador de atributos calculados
            }
        } else {
            // Mostrar error si el archivo ZIP está vacío o tiene una estructura incorrecta
            errorDiv.textContent = 'Error: No se ha encontrado ningun archivo JSON o la estructura del ZIP es incorrecta';
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';
            // Deshabilitar el botón de aceptar
            document.getElementById("button-aceptar").classList.add('boton-disabled');
            datosAlumnosParaPredecir = {}; // Limpiar los datos si hay un error
        }

    } catch (error) {
        // Manejar cualquier error que ocurra durante la solicitud
        if (error.name === 'AbortError') {
            // Si el error es un aborto, no mostramos el mensaje de error
            console.log("Solicitud cancelada");
        } else {
            // Si es otro tipo de error, mostramos el mensaje de error
            console.error("Error:", error);
            errorDiv.textContent = 'Ha ocurrido un error en la comunicación con el servidor.';
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';
        }
        // Deshabilitar el botón de aceptar
        document.getElementById("button-aceptar").classList.add('boton-disabled');
        datosAlumnosParaPredecir = {};
    } 
}

// Función para cerrar el formulario de predicción
function cerrarFormularioPrediccion() {
    // Ocultar el modal
    document.getElementById('prediccionModal').style.display = 'none';
}

// Función que es llamada al pulsar en aceptar y llama a la función para realizar la predicción si no se necesita evaluar
function aceptar() {
    if (necesitaEvaluar) {
        // Si se necesita evaluar, abrir el modal de evaluación
        openCustomModal('/templates/evaluarParaPredecir.html')
    } else {
        // Si no se necesita evaluar, realizar la predicción directamente
        realizarPrediccion();
    }
}

// Función para realizar la predicción para cada alumno
async function realizarPrediccion() {
    const resultados = []; // Array para almacenar los resultados de la predicción

    // Iteramos sobre cada alumno en 'datosAlumnosParaPredecir'
    for (let i = 0; i < datosAlumnosParaPredecir.filename.length; i++) {
        // Obtener el 'filename' actual y sus valores correspondientes
        const alumnoFilename = datosAlumnosParaPredecir.filename[i];
        
        // Crear objeto 'valores' solo con las características seleccionadas
        const valores = [];
        datosAlumnosParaPredecir.caracteristicas.forEach((caracteristica) => {
            if (caracteristica === "Promedio de mensajes") {
                valores.push(datosAlumnosParaPredecir.promedio_mensajes[i]);
            } else if (caracteristica === "Longitud promedio de mensajes") {
                valores.push(datosAlumnosParaPredecir.longitud_promedio[i]);
            } else if (caracteristica === "Dispersión de los mensajes") {
                valores.push(datosAlumnosParaPredecir.dispersion_promedio[i]);
            } else if (caracteristica === "% Relación con la asignatura") {
                valores.push(datosAlumnosParaPredecir.relacion[i]);
            } else if (caracteristica === "% Conocimiento sobre la asignatura") {
                valores.push(datosAlumnosParaPredecir.conocimiento[i]);
            } else if (caracteristica === "(IA) - % Relación con la asignatura") {
                valores.push(datosAlumnosParaPredecir.relacionIA[i]);
            } else if (caracteristica === "(IA) - % Conocimiento sobre la asignatura") {
                valores.push(datosAlumnosParaPredecir.conocimientoIA[i]);
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

            // Agregar los resultados individuales al arreglo de 'resultados'
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

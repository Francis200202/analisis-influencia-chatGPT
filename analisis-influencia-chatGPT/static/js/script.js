// Función para redirigir a la página de estadísticas
function pagina_estadisticas() {
    window.location.href = '/templates/conversaciones.html';
}

// Función para redirigir a la página de correlación
function pagina_correlacion() {
    window.location.href = '/templates/analisis.html';
}

// Función para redirigir a la página de predicción
function pagina_prediccion() {
    window.location.href = '/templates/entrenamiento.html';
}

// Función para abrir un modal con un iframe que carga la página evaluar
function openCustomModal(url) {
    // Agrega el efecto difuminado al fondo
    document.getElementById('index').classList.add('blur-background-custom');
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

        if (event.data.state) {
            acceptButton.classList.remove("boton-disabled");
        } else {
            acceptButton.classList.add("boton-disabled");
        }
    }
});

// Función para navegar dentro del modal (pasar al siguiente o anterior alumno)
function navigateModal(direction) {
    const iframe = document.getElementById("custom-modal-iframe");

    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: "navigateConversation", direction }, "*");
    } else {
        console.error("Iframe no encontrado o no accesible.");
    }
}

// Función para cerrar el modal
function closeCustomModal() {
    // Remueve el efecto difuminado del fondo
    document.getElementById('index').classList.remove('blur-background-custom');
    document.getElementById('header').classList.remove('blur-background-custom');

    // Oculta el overlay y limpia el src del iframe
    document.getElementById('custom-modal-overlay').style.display = 'none';
    document.getElementById('custom-modal-iframe').src = '';

    // Actualizar numero de alumnos evaluados
    updateEvaluacionStatus();
}

// Función para mostrar la ayuda
function ayuda() {
    document.getElementById('help-container').style.display = 'block';
    document.getElementById('ayuda_header').style.display = 'block';
    document.getElementById('index').style.display = 'none';
    document.getElementById('ayuda-link').style.color = '#abebc6';
    document.getElementById('inicio-link').style.color = 'white';
}

// Manejar el envío del formulario de carga de archivos ZIP
const form = document.getElementById('upload-form');
form.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevenir el comportamiento por defecto del formulario

    // Obtener los datos del formulario
    const formData = new FormData(form);

    // Elementos de la interfaz que se actualizarán según el resultado de la carga
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const usarIA = document.getElementById('usar-IA');
    const hacerEval = document.getElementById("hacer-evaluacion");
    const atrCalc = document.getElementById('atrib-calc');
    const atrCarg = document.getElementById('atrib-carg');

    // Deshabilitar enlaces y botones
    document.getElementById("estadisticasLink").classList.add("disabled");
    document.getElementById("upload-excel").classList.add('boton-disabled');
    document.getElementById("correlacionLink").classList.add('disabled');
    document.getElementById("prediccionLink").classList.add('disabled');

    // Eliminar datos almacenados en la sesión
    sessionStorage.removeItem('estadisticasEnabled');
    sessionStorage.removeItem('corrPredEnabled');

    document.getElementById('atrib-calc').style.display = 'none';

    try {
        // Realizar la solicitud a la API para subir el archivo ZIP
        const response = await fetch('/api/upload-zip2', {
            method: 'POST',
            body: formData
        });
        // Convertir la respuesta a formato JSON
        const data = await response.json();

        // Verificar si la respuesta es exitosa y si el directorio de subida no está vacío
        if (response.ok && !data.isUploadDirEmpty) {
            resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            // Habilitar enlaces y botones
            document.getElementById("estadisticasLink").classList.remove('disabled');
            document.getElementById("upload-excel").classList.remove('boton-disabled');
            sessionStorage.setItem('estadisticasEnabled', 'true');

            // Mostrar opciones adicionales tras la carga exitosa
            usarIA.style.display = 'block';
            hacerEval.style.display = 'block';
            atrCalc.style.display = 'none';
            atrCarg.style.display = 'none';

            // Actualizar el estado de la evaluación
            updateEvaluacionStatus();
        } else {
            // Mostrar mensaje de error si la estructura del ZIP es incorrecta o faltan archivos JSON
            errorDiv.textContent = 'Error: No se ha encontrado ningun archivo JSON o la estructura del ZIP es incorrecta';
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';

            // Ocultar opciones adicionales y deshabilitar botones
            usarIA.style.display = 'none';
            hacerEval.style.display = 'none';
            document.getElementById("estadisticasLink").classList.add("disabled");
            document.getElementById("upload-excel").classList.add('boton-disabled');
            document.getElementById("correlacionLink").classList.add('disabled');
            document.getElementById("prediccionLink").classList.add('disabled');
            sessionStorage.removeItem('estadisticasEnabled');
            atrCalc.style.display = 'none';
            atrCarg.style.display = 'none';
        }

    } catch (error) {
        // Manejar cualquier error que ocurra durante la solicitud
        console.error("Error:", error);
        errorDiv.textContent = 'Ha ocurrido un error en la comunicación con el servidor.';
        errorDiv.style.display = 'block';
        resultDiv.textContent = '';

        // Ocultar opciones adicionales y deshabilitar botones en caso de error
        usarIA.style.display = 'none';
        hacerEval.style.display = 'none';
        document.getElementById("estadisticasLink").classList.add("disabled");
        document.getElementById("upload-excel").classList.add('boton-disabled');
        document.getElementById("correlacionLink").classList.add('disabled');
        document.getElementById("prediccionLink").classList.add('disabled');
        sessionStorage.removeItem('estadisticasEnabled');
    }
});

// Manejar el envío del formulario de carga del archivo Excel
const form2 = document.getElementById('upload-form2');
form2.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form2);

    // Obtener elementos de la interfaz para mostrar resultados o errores
    const resultDiv = document.getElementById('result2');
    const errorDiv = document.getElementById('error');

    document.getElementById('atrib-calc').style.display = 'none';

    try {
        // Realizar la solicitud a la API
        const response = await fetch('/api/upload-excel', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            // Si la respuesta es exitosa, mostrar mensaje de éxito
            resultDiv.textContent = 'Archivo cargado exitosamente.';

            // Habilitar enlaces para correlación y predicción
            document.getElementById("correlacionLink").classList.remove('disabled');
            document.getElementById("prediccionLink").classList.remove('disabled');

            // Guardar en sessionStorage que estas funciones están habilitadas
            sessionStorage.setItem('corrPredEnabled', 'true');

            // Ocultar el mensaje de error si existía previamente
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

        } else {
            // Si hay un error en la respuesta, obtener el mensaje del servidor
            const error = await response.json();
            errorDiv.textContent = `Error: ${error.detail}`;
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';

            // Deshabilitar enlaces de correlación y predicción
            document.getElementById("correlacionLink").classList.add('disabled');
            document.getElementById("prediccionLink").classList.add('disabled');

            // Eliminar el estado guardado en sessionStorage
            sessionStorage.removeItem('corrPredEnabled');
        }

    } catch (error) {
        // Manejar cualquier error que ocurra durante la solicitud
        console.error("Error:", error);
        errorDiv.textContent = 'Ha ocurrido un error en la comunicación con el servidor.';

        // Deshabilitar los enlaces de correlación y predicción en caso de error
        document.getElementById("correlacionLink").classList.add("disabled");
        document.getElementById("prediccionLink").classList.add("disabled");

        // Eliminar el estado guardado en sessionStorage
        sessionStorage.removeItem('corrPredEnabled');

        // Mostrar el mensaje de error y limpiar el resultado anterior
        errorDiv.style.display = 'block';
        resultDiv.textContent = '';
    }
});

// Función para guardar la evaluación en un fichero txt
async function guardarEvaluacion() {
    // Pedir al usuario un nombre para el archivo sin extensión
    let nombreArchivo = prompt("Por favor, introduce el nombre del archivo (sin extensión):");

    // Si el usuario no proporciona un nombre, mostrar una alerta y salir de la función
    if (!nombreArchivo) {
        alert("No se proporcionó un nombre de archivo.");
        return;
    }

    try {
        // Solicitar los resultados de la evaluación al servidor
        let response = await fetch('/api/obtenerEvaluacion');
        let resultados = await response.json();

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            alert("Error al obtener los resultados: " + (resultados.detail || "Error desconocido"));
            return;
        }

        // Convertir los resultados a texto
        let contenidoArchivo = '';
        for (let key in resultados) {
            contenidoArchivo += `${key}: ${JSON.stringify(resultados[key])}\n`;
        }

        // Crear un Blob con el contenido
        let blob = new Blob([contenidoArchivo], { type: 'text/plain;charset=utf-8' });

        // Crear un enlace temporal para descargar el archivo
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo; // Asignar el nombre de archivo elegido por el usuario
        document.body.appendChild(a); // Agregar el enlace al documento
        a.click(); // Simular un clic para iniciar la descarga

        // Limpiar la URL y eliminar el enlace temporal
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Informar al usuario que el archivo ha sido guardado
        alert("Archivo guardado exitosamente.");

    } catch (error) {
        // Manejo de errores en caso de problemas con la comunicación con el servidor
        console.error("Error:", error);
        alert("Ha ocurrido un error en la comunicación con el servidor.");
    }
}

// Función para mostrar un cuadro de confirmación antes de eliminar la evaluación
function confirmResetEvaluacion() {
        const isConfirmed = confirm("¿Estás seguro de que quieres borrar toda la evaluación?");
        if (isConfirmed) {
            resetEvaluacion(); // Si el usuario confirma, se llama a la función que resetea la evaluación
        }
    }

// Función asincrona para resetear la evaluación
async function resetEvaluacion() {
    try {
        // Enviar una solicitud POST al servidor para eliminar las evaluaciones
        const response = await fetch('/api/reset-evaluacion', {
            method: 'POST' 
        });
        const data = await response.json();
        document.getElementById("evaluacion-status").textContent = `Evaluaciones eliminadas. Alumnos evaluados: 0 de ${data.totalAlumnos}`;
    } catch (error) {
        console.error("Error al eliminar las evaluaciones:", error);
    }
}

// Función asincrona para actualizar el estado de la evaluación
async function updateEvaluacionStatus() {
    try {
        // Hacer una petición GET al servidor para obtener el estado de la evaluación
        const response = await fetch('/api/estado-evaluacion');
        const data = await response.json();
        document.getElementById("evaluacion-status").textContent = `Alumnos evaluados: ${data.alumnosEvaluados} de ${data.totalAlumnos}`;
    } catch (error) {
        console.error("Error al obtener el estado de evaluación:", error);
    }
}

// Evento que se ejecuta cuando se selecciona un archivo en el input de la sección de evaluación
document.getElementById('fileInput2').addEventListener('change', function(event) {
        const file = event.target.files[0]; // Obtener el archivo seleccionado
        if (file) {
            const formData = new FormData();
            formData.append('file', file); // Agregar el archivo al FormData para enviarlo

            // Realizar la petición POST al servidor para procesar el archivo
            fetch('/api/uploadEvaluacion', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Archivo procesado:', data.data);

                    // Actualizar el estado de evaluación después de cargar el archivo
                    updateEvaluacionStatus();
                } else {
                    // Mostrar mensaje de error en caso de fallo
                    alert('Error: ' + data.message);
                    console.error('Error al subir el archivo:', data.message);
                }

                // Resetear el input después de procesar el archivo
                event.target.value = ''; // Esto permite volver a cargar el mismo archivo
            })
            .catch(error => {
                console.error('Error al subir el archivo:', error);
                alert('Error de red: No se pudo comunicar con el servidor.');
            });
        }
    });

// Función para mostrar u ocultar el modal de información sobre la IA
function infoIA() {
    const modal = document.getElementById('infoModal');
    modal.classList.toggle('hidden'); // Alternar la visibilidad del modal
}

// Función asincrona para realizar el análisis mediante IA
async function analisisIA() {
    var asignatura = document.getElementById('input-asignatura').value;

    // Verificar si el campo de asignatura está vacío
    if (asignatura.length === 0) {
        alert("Por favor, introduce la asignatura.");
        return;  // Detener la ejecución si no se ha introducido la asignatura
    }

    // Mostrar el indicador de carga
    var loadingIndicator = document.getElementById('loading-indicator');
    loadingIndicator.style.display = 'block';
    document.getElementById('atrib-calc').style.display = 'none';

    console.log(asignatura);

    try {
        // Realizar la solicitud a la API
        let response = await fetch('/api/analisisIA', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ asignatura })  // Enviar la asignatura como JSON
        });

        // Convertir la respuesta a JSON
        let data = await response.json();

        if (response.ok) {
            document.getElementById('atrib-calc').style.display = 'block';
            document.getElementById('atrib-carg').style.display = 'none';
        } else {
            alert("Ha ocurrido un error: " + (data.error || "Error desconocido"));
            document.getElementById('atrib-calc').style.display = 'none';
            document.getElementById('atrib-carg').style.display = 'none';
        }

    } catch (error) {
        // Manejar cualquier error que ocurra durante la solicitud
        console.error("Error:", error);
        alert("Ha ocurrido un error en la comunicación con el servidor.");
    } finally {
        // Ocultar el indicador de carga
        loadingIndicator.style.display = 'none';
    }
}

// Función asincrona para guardar los resultados en un archivo de texto
async function guardarResultados() {
    let nombreArchivo = prompt("Por favor, introduce el nombre del archivo (sin extensión):");

    // Verificar si el usuario ingresó un nombre de archivo
    if (!nombreArchivo) {
        alert("No se proporcionó un nombre de archivo.");
        return;
    }

    try {
        // Solicitar los resultados desde el servidor
        let response = await fetch('/api/obtenerResultados');
        let resultados = await response.json();

        if (!response.ok) {
            alert("Error al obtener los resultados: " + (resultados.detail || "Error desconocido"));
            return;
        }

        // Convertir los resultados a texto
        let contenidoArchivo = '';
        for (let key in resultados) {
            contenidoArchivo += `${key}: ${JSON.stringify(resultados[key])}\n`;
        }

        // Crear un Blob con el contenido
        let blob = new Blob([contenidoArchivo], { type: 'text/plain;charset=utf-8' });

        // Crear un enlace de descarga
        let url = window.URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();

        // Limpiar recursos después de la descarga
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert("Archivo guardado exitosamente.");

    } catch (error) {
        console.error("Error:", error);
        alert("Ha ocurrido un error en la comunicación con el servidor.");
    }
}

// Manejar la carga de archivos desde el input de la sección de calcular atributos mediante IA
document.getElementById('fileInput').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            // Realizar la petición POST al servidor para procesar el archivo
            fetch('/api/uploadResults', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    console.log('Archivo procesado:', data.data);
                    document.getElementById('atrib-carg').style.display = 'block';
                    document.getElementById('atrib-calc').style.display = 'none';
                } else {
                    // Mostrar mensaje de error en caso de fallo
                    alert('Error: ' + data.message);
                    console.error('Error al subir el archivo:', data.message);
                    document.getElementById('atrib-carg').style.display = 'none';
                    document.getElementById('atrib-calc').style.display = 'none';
                }

                // Resetear el input después de procesar el archivo
                event.target.value = ''; // Esto permite volver a cargar el mismo archivo
            })
            .catch(error => {
                console.error('Error al subir el archivo:', error);
                alert('Error de red: No se pudo comunicar con el servidor.');
                document.getElementById('atrib-carg').style.display = 'none';
                document.getElementById('atrib-calc').style.display = 'none';
            });
        }
    });


// Ejecutar código una vez que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function () {
    // Comprobar si 'estadisticasEnabled' está en sessionStorage
    let isEstadisticasEnabled = sessionStorage.getItem('estadisticasEnabled');
    let isCorrPredEnabled = sessionStorage.getItem('corrPredEnabled');
    
    // Comprobar si la carpeta en el servidor está vacía
    fetch('/api/check-folder-empty')
        .then(response => response.json())
        .then(data => {
            // Si UPLOAD_DIR esta vacia deshabilitar
            if (isEstadisticasEnabled === 'true' && !data.isUploadDirEmpty) {
                // Habilitar el enlace si está guardado en localStorage y la carpeta no está vacía
                document.getElementById("estadisticasLink").classList.remove('disabled');
                document.getElementById("upload-excel").classList.remove('boton-disabled');
                document.getElementById("usar-IA").style.display = 'block';
                document.getElementById("hacer-evaluacion").style.display = 'block';

                // Actualizar estado de la evaluación
                updateEvaluacionStatus();
            } else {
                // Deshabilitar el enlace si la carpeta está vacía
                document.getElementById("estadisticasLink").classList.add('disabled');
                document.getElementById("correlacionLink").classList.add('disabled');
                document.getElementById("prediccionLink").classList.add('disabled');
                sessionStorage.removeItem('corrPredEnabled');
                document.getElementById("upload-excel").classList.add('boton-disabled');
                document.getElementById("usar-IA").style.display = 'none';
                document.getElementById("hacer-evaluacion").style.display = 'none';
            }

            // Si UPLOAD_EXCEL esta vacia deshabilitar
            if (isCorrPredEnabled === 'true' && !data.isUploadExcelEmpty) {
                // Habilitar el enlace si está guardado en localStorage y la carpeta no está vacía
                document.getElementById("correlacionLink").classList.remove('disabled');
                document.getElementById("prediccionLink").classList.remove('disabled');
            } else {
                // Deshabilitar el enlace si la carpeta está vacía
                document.getElementById("correlacionLink").classList.add('disabled');
                document.getElementById("prediccionLink").classList.add('disabled');
            }
        })
        .catch(error => {
            console.error('Error al comprobar la carpeta:', error);
        });
});
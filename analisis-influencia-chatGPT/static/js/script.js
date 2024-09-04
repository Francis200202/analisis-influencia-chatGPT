//Pagina conversaciones
function pagina_conversaciones() {
    window.location.href = '/templates/conversaciones.html';
}

function ayuda() {
    document.getElementById('help').style.display = 'block';
    document.getElementById('seleccionar_archivos').style.display = 'none';
    document.getElementById("usar-IA").style.display = 'none';
    document.getElementById('ayuda-link').style.color = '#abebc6';
    document.getElementById('inicio-link').style.color = 'white';
}


const form = document.getElementById('upload-form');
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const usarIA = document.getElementById('usar-IA');
    const atrCalc = document.getElementById('atrib-calc');
    const atrCarg = document.getElementById('atrib-carg');

    document.getElementById('atrib-calc').style.display = 'none';

    try {
        // Realizar la solicitud a la API
        const response = await fetch('/api/upload-zip', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            resultDiv.textContent = 'Archivo cargado y extraído exitosamente.';
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';
            document.getElementById("estadisticasLink").classList.remove('disabled');
            sessionStorage.setItem('estadisticasEnabled', 'true');
            usarIA.style.display = 'block';
            atrCalc.style.display = 'none';
            atrCarg.style.display = 'none';
        } else {
            const error = await response.json();
            errorDiv.textContent = `Error: ${error.detail}`;
            errorDiv.style.display = 'block';
            resultDiv.textContent = '';
            usarIA.style.display = 'none';
            document.getElementById("estadisticasLink").classList.add("disabled");
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
        usarIA.style.display = 'none';
        document.getElementById("estadisticasLink").classList.add("disabled");
        sessionStorage.removeItem('estadisticasEnabled');
    }
});

function infoIA() {
    const modal = document.getElementById('infoModal');
    modal.classList.toggle('hidden');
}

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

    // Desplazar el contenedor hacia el final
            document.getElementById('index').scrollTo({
                top: 140,
                behavior: 'smooth'
            });

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

async function guardarResultados() {
    let nombreArchivo = prompt("Por favor, introduce el nombre del archivo (sin extensión):");

    if (!nombreArchivo) {
        alert("No se proporcionó un nombre de archivo.");
        return;
    }

    try {
        // Solicitar los resultados desde el servidor (suponiendo que se necesita consultar los datos)
        let response = await fetch('/api/obtenerResultados');  // Esta es una API que debes implementar
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

        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        alert("Archivo guardado exitosamente.");

    } catch (error) {
        console.error("Error:", error);
        alert("Ha ocurrido un error en la comunicación con el servidor.");
    }
}

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
                }
            })
            .catch(error => {
                console.error('Error al subir el archivo:', error);
                alert('Error de red: No se pudo comunicar con el servidor.');
            });
        }
    });


document.addEventListener('DOMContentLoaded', function () {
    // Comprobar si 'estadisticasEnabled' está en sessionStorage
    let isEstadisticasEnabled = sessionStorage.getItem('estadisticasEnabled');
    
    // Comprobar si la carpeta en el servidor está vacía
    fetch('/api/check-folder-empty')
        .then(response => response.json())
        .then(data => {
            if (isEstadisticasEnabled === 'true' && !data.isEmpty) {
                // Habilitar el enlace si está guardado en localStorage y la carpeta no está vacía
                document.getElementById("estadisticasLink").classList.remove('disabled');
                document.getElementById("usar-IA").style.display = 'block';
            } else {
                // Deshabilitar el enlace si la carpeta está vacía
                document.getElementById("estadisticasLink").classList.add('disabled');
                document.getElementById("usar-IA").style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error al comprobar la carpeta:', error);
        });
});
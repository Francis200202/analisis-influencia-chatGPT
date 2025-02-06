// Función principal para crear el gráfico de actividad estilo GitHub
function buildActivityGraph(parentElement, options) {
  // Combinar las opciones proporcionadas con las opciones predeterminadas
  var settings = Object.assign(
    {
      colorStep: 15, // Paso de color para los niveles de actividad
      click: null, // Función de callback para el evento de clic
      data: [], // Datos de actividad por día
    },
    options
  );

  // Objeto para almacenar los conteos de actividad por fecha
  var objTimestamp = {};

  // Función para formatear números menores a 10 con un cero a la izquierda
  function prettyNumber(number) {
    return number < 10 ? "0" + number.toString() : number.toString();
  }

  // Función para procesar la lista de actividad y acumular los conteos por día
  function processActivityList(activityByDay) {
    for (let [timestamp, count] of Object.entries(activityByDay)) {
      const date = new Date(timestamp);
      const displayDate = getDisplayDate(date);

      // Acumular los conteos de actividad por fecha
      if (!objTimestamp[displayDate]) {
        objTimestamp[displayDate] = count;
      } else {
        objTimestamp[displayDate] += count;
      }
    }
  }

  // Función para formatear la fecha en el formato "dd/MM/yyyy"
  function getDisplayDate(date) {
    // Función auxiliar para formatear cadenas con placeholders
    function formatString(str, args) {
        return str.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] !== "undefined" ? args[number] : match;
        });
    }

    return formatString("{0}/{1}/{2}", [
        prettyNumber(date.getDate()),    // Día primero
        prettyNumber(date.getMonth() + 1),  // Mes después
        date.getFullYear(),               // Año al final
    ]);
}

  // Función para obtener el conteo de actividad para una fecha específica
  function getCount(displayDate) {
    return objTimestamp[displayDate] || 0;
  }

  // Función para obtener el color correspondiente al nivel de actividad
  function getColor(count) {
      const colorRanges = ["#eeeeee", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
      const index = count === 0 ? 0 : Math.min(Math.floor((count - 1) / settings.colorStep) + 1, colorRanges.length - 1);
      return colorRanges[index];
  }
  

  // Iniciar la creación del gráfico
  function start() {
    // Procesar los datos de actividad
    processActivityList(settings.data);
    const wrapChart = parentElement;

    const radius = 2; // Radio de las esquinas de los rectángulos
    const hoverColor = "#999"; // Color al pasar el mouse sobre los rectángulos
    const clickCallback = settings.click; // Callback para el evento de clic

    // Establecer la fecha de inicio (hace 12 meses)
    let startDate;
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    startDate.setDate(startDate.getDate() + 1);

    // Establecer la fecha de fin (hoy)
    let endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 12);
    endDate.setDate(endDate.getDate() - 1);

    let loopHtml = ""; // HTML para el gráfico
    const step = 13; // Espaciado entre los rectángulos

    let monthPosition = []; // Almacenar las posiciones de los meses
    monthPosition.push({ monthIndex: startDate.getMonth(), x: 0 });
    let usingMonth = startDate.getMonth();

    let week = 0; // Contador de semanas
    let gx = week * step; // Posición horizontal inicial
    let itemHtml = `<g transform="translate(${gx}, 0)">`; // Grupo SVG para cada semana

    // Iterar sobre cada día desde la fecha de inicio hasta la fecha de fin
    for (
      ;
      startDate.getTime() <= endDate.getTime();
      startDate.setDate(startDate.getDate() + 1)
    ) {
      const monthInDay = startDate.getMonth();
      const dataDate = getDisplayDate(startDate);

      // Actualizar la posición del mes si cambia
      if (startDate.getDay() === 0 && monthInDay !== usingMonth) {
        usingMonth = monthInDay;
        monthPosition.push({ monthIndex: usingMonth, x: gx });
      }

      const count = getCount(dataDate); // Obtener el conteo de actividad
      const color = getColor(count); // Obtener el color correspondiente

      const y = startDate.getDay() * step; // Posición vertical basada en el día de la semana
      itemHtml += `<rect class="day" width="11" height="11" y="${y}" fill="${color}" data-count="${count}" data-date="${dataDate}" rx="${radius}" ry="${radius}"/>`;

      // Finalizar el grupo SVG al final de la semana
      if (startDate.getDay() === 6) {
        itemHtml += `</g>`;
        loopHtml += itemHtml;

        week++;
        gx = week * step;
        itemHtml = `<g transform="translate(${gx}, 0)">`;
      }
    }

    // Añadir el último grupo SVG si no se ha cerrado
    if (itemHtml !== "") {
      itemHtml += `</g>`;
      loopHtml += itemHtml;
    }

    // Añadir los nombres de los meses al gráfico
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    for (let i = 0; i < monthPosition.length; i++) {
      const item = monthPosition[i];
      const monthName = monthNames[item.monthIndex];
      loopHtml += `<text x="${item.x}" y="-5" class="month">${monthName}</text>`;
    }

    // Añadir etiquetas de los días de la semana
    loopHtml += `
            <text text-anchor="middle" class="wday" dx="-10" dy="23">M</text>
            <text text-anchor="middle" class="wday" dx="-10" dy="49">W</text>
            <text text-anchor="middle" class="wday" dx="-10" dy="75">F</text>
        `;

    // Crear el SVG final
    const wireHtml = `
          <svg width="720" height="110" viewBox="0 0 720 110" class="js-calendar-graph-svg">
            <g transform="translate(20, 20)">
              ${loopHtml}
            </g>
          </svg>
        `;

    wrapChart.innerHTML = wireHtml;

    // Añadir eventos de clic y hover a los rectángulos
    const dayElements = wrapChart.querySelectorAll(".day");
    dayElements.forEach((dayElement) => {
      dayElement.addEventListener("click", function () {
        if (clickCallback) {
          clickCallback(
            this.getAttribute("data-date"),
            parseInt(this.getAttribute("data-count"))
          );
        }
      });

      dayElement.addEventListener("mouseenter", function () {
        this.setAttribute("style", `stroke-width: 1; stroke: ${hoverColor}`);
      });

      dayElement.addEventListener("mouseleave", function () {
        this.setAttribute("style", "stroke-width: 0");
      });
    });

    // Crear o seleccionar el tooltip
    let tooltip;
    if (!document.querySelector(".svg-tip")) {
      tooltip = document.createElement("div");
      tooltip.className = "svg-tip";
      tooltip.style.display = "none";
      document.body.appendChild(tooltip);
    } else {
      tooltip = document.querySelector(".svg-tip");
    }

    // Funciones para manejar los eventos de hover
    function mouseEnter(evt) {
      const targetRect = evt.target.getBoundingClientRect();
      const count = evt.target.getAttribute("data-count");
      const date = evt.target.getAttribute("data-date");

      if (count == 0) return;

      const text = `${count} mensajes el ${date}`;

      tooltip.innerHTML = text;
      tooltip.style.display = "block";
      tooltip.style.top = targetRect.top - tooltip.offsetHeight - 5 + "px";
      tooltip.style.left = targetRect.left - tooltip.offsetWidth / 2 + "px";
    }

    function mouseLeave(evt) {
      tooltip.style.display = "none";
    }

    // Añadir eventos de hover a los rectángulos
    const rects = document.querySelectorAll(".day");
    rects.forEach(function (rect) {
      rect.addEventListener("mouseenter", mouseEnter);
      rect.addEventListener("mouseleave", mouseLeave);
    });
  }

  // Iniciar la creación del gráfico
  start();
}

// ------------------------------------------------------------

// Función para preparar los datos para el gráfico de barras
function prepareBarChartData(activityData) {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  // Almacenar los conteos por día, rellenando con ceros los días faltantes
  const allDates = {};
  let currentDate = new Date(oneYearAgo);
  while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      allDates[dateStr] = 0;
      currentDate.setDate(currentDate.getDate() + 1);
  }

  // Rellenar los conteos para los días que tienen datos
  Object.keys(activityData).forEach((dateStr) => {
      if (allDates.hasOwnProperty(dateStr)) {
          allDates[dateStr] = activityData[dateStr];
      }
  });

  const labels = Object.keys(allDates);
  const data = Object.values(allDates);

  // Preparar las etiquetas de los meses
  const monthLabels = labels.map((dateStr) => {
      const dateObj = new Date(dateStr);
      return dateObj.getDate() === 1
          ? dateObj.toLocaleString("default", { month: "short" }) : "";
  });

  return {
      labels: labels,
      data: data,
      monthLabels: monthLabels,
  };
}

let activityBarChart;

// Función para destruir el gráfico de barras si ya existe
function destroyActivityBarChart() {
    if (activityBarChart) {
        activityBarChart.destroy();
    }
}

// Función para crear el gráfico de barras
function buildActivityBarChart(data) {
  const preparedData = prepareBarChartData(data);

  const barCtx = document.getElementById("activity-bar-chart").getContext("2d");

  destroyActivityBarChart();
  activityBarChart = new Chart(barCtx, {
      type: "bar",
      data: {
          labels: preparedData.labels,
          datasets: [
              {
                  label: "Mensajes",
                  data: preparedData.data,
                  // backgroundColor: "#216e39",
                  borderColor: "#30a14e",
                  borderWidth: 1,
              },
          ],
      },
      options: {
          aspectRatio: 4,
          plugins: {
              legend: {
                  display: false, 
              },
          },
          scales: {
              x: {
                  grid: {
                      display: false, // Ocultar las líneas de la cuadrícula vertical
                  },
                  ticks: {
                      callback: function (value, index) {
                          // Mostrar solo la etiqueta del mes para el primer día de cada mes
                          return preparedData.monthLabels[index];
                      },
                      autoSkip: false, // Mostrar todas las etiquetas
                      maxRotation: 0,
                      minRotation: 0,
                  },
              },
              y: {
                  beginAtZero: true,
              },
          },
          responsive: true,
      },
  });
}
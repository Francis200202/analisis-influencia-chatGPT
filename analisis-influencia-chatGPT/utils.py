from datetime import datetime, timedelta
import locale

# Establecer la configuración regional a español para manejar fechas en español
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')

# Función para agrupar una fecha en categorías relativas al tiempo actual
def time_group(dt):
    now = datetime.now() # Obtiene la fecha y hora actual
    today = datetime(now.year, now.month, now.day) # Fecha de hoy sin horas, minutos ni segundos
    yesterday = today - timedelta(days=1) # Fecha de ayer
    last_week = today - timedelta(days=7) # Fecha hace 7 días
    last_30_days = today - timedelta(days=30) # Fecha hace 30 días
    
    # Compara la fecha proporcionada con los rangos de tiempo definidos
    if dt >= today:
        return "Hoy" # Si la fecha es hoy
    elif dt >= yesterday:
        return "Ayer" # Si la fecha es ayer
    elif dt >= last_week:
        return "Últimos 7 días" # Si la fecha está dentro de los últimos 7 días
    elif dt >= last_30_days:
        return "Últimos 30 días" # Si la fecha está dentro de los últimos 30 días
    elif dt.year == now.year:
        return dt.strftime("%B").capitalize()  # Si la fecha es este año, devuelve el nombre del mes
    else:
        return dt.strftime("%B %Y").capitalize()  # Si la fecha es de otro año, devuelve el mes y el año


# Función para convertir una duración en segundos a un formato legible
def human_readable_time(seconds, short=False):
    # Define las etiquetas para segundos, minutos, horas y días según el modo corto o largo
    if short:
        s_title = s_title_plural = "s" # Modo corto: "s" para segundos
        m_title = m_title_plural = "m" # Modo corto: "m" para minutos
        h_title = h_title_plural = "h" # Modo corto: "h" para horas
        d_title = d_title_plural = "d" # Modo corto: "d" para días
    else:
        s_title = " segundo" # Modo largo: "segundo" en singular
        s_title_plural = " segundos" # Modo largo: "segundos" en plural
        m_title = " minuto" # Modo largo: "minuto" en singular
        m_title_plural = " minutos" # Modo largo: "minutos" en plural
        h_title = " hora" # Modo largo: "hora" en singular
        h_title_plural = " horas" # Modo largo: "horas" en plural
        d_title = " día" # Modo largo: "día" en singular
        d_title_plural = " días" # Modo largo: "días" en plural

    seconds = round(seconds) # Redondea los segundos al entero más cercano

    # Convierte los segundos a días, horas, minutos o segundos según corresponda
    if seconds >= 86400:  # 1 dia = 86400 segundos
        days = round(seconds / 86400)
        return f"{days}{d_title}" if days == 1 else f"{days}{d_title_plural}"
    elif seconds >= 3600:  # 1 hora = 3600 segundos
        hours = round(seconds / 3600)
        return f"{hours}{h_title}" if hours == 1 else f"{hours}{h_title_plural}"
    elif seconds >= 60:  # 1 minuto = 60 segundos
        minutes = round(seconds / 60)
        return f"{minutes}{m_title}" if minutes == 1 else f"{minutes}{m_title_plural}"
    else:
        return f"{seconds}{s_title}" if seconds == 1 else f"{seconds}{s_title_plural}"

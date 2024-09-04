from datetime import datetime, timedelta
import locale

# Establecer la configuraci�n regional a espa�ol
locale.setlocale(locale.LC_TIME, 'es_ES.UTF-8')

def time_group(dt):
    now = datetime.now()
    today = datetime(now.year, now.month, now.day)
    yesterday = today - timedelta(days=1)
    last_week = today - timedelta(days=7)
    last_30_days = today - timedelta(days=30)
    
    if dt >= today:
        return "Hoy"
    elif dt >= yesterday:
        return "Ayer"
    elif dt >= last_week:
        return "Últimos 7 días"
    elif dt >= last_30_days:
        return "Últimos 30 días"
    elif dt.year == now.year:
        return dt.strftime("%B").capitalize()  # Return el nombre del mes
    else:
        return dt.strftime("%B %Y").capitalize()  # Return el mes y el año


def human_readable_time(seconds, short=False):
    if short:
        s_title = s_title_plural = "s"
        m_title = m_title_plural = "m"
        h_title = h_title_plural = "h"
        d_title = d_title_plural = "d"
    else:
        s_title = " segundo"
        s_title_plural = " segundos"
        m_title = " minuto"
        m_title_plural = " minutos"
        h_title = " hora"
        h_title_plural = " horas"
        d_title = " día"
        d_title_plural = " días"

    seconds = round(seconds)
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

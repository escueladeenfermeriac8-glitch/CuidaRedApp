/**
 * SyncBadge — Indicador visual de estado de sincronización
 * DISENO_BASE.md §7.5:
 *   - Nube con tilde (enviado)
 *   - Nube con reloj / sync (pendiente)
 *   - Nube con alerta (revisar)
 * Respetando accesibilidad: siempre ícono + texto (o accessible tooltip/aria-label).
 */

import { CloudCheck, CloudSync, CloudAlert } from 'lucide-react'
import type { SyncEstado } from '@/types'

export interface SyncBadgeProps {
  estado?: SyncEstado
  compacto?: boolean
  size?: number
  className?: string
}

export function SyncBadge({
  estado = 'enviado',
  compacto = false,
  size = 14,
  className = '',
}: SyncBadgeProps) {
  const config = {
    enviado: {
      Icon: CloudCheck,
      texto: 'Enviado',
      descripcion: 'Sincronizado con la central',
      clase: 'sync-badge-enviado',
      colorVar: 'var(--ok, #2F9E6B)',
    },
    pendiente: {
      Icon: CloudSync,
      texto: 'Pendiente',
      descripcion: 'Guardado localmente en este celular (pendiente de envío)',
      clase: 'sync-badge-pendiente',
      colorVar: 'var(--lago, #1AA6A0)',
    },
    revisar: {
      Icon: CloudAlert,
      texto: 'Revisar',
      descripcion: 'Atención: requiere revisión o resolver duplicado',
      clase: 'sync-badge-revisar',
      colorVar: 'var(--critico, #C8392F)',
    },
  }[estado] ?? {
    Icon: CloudCheck,
    texto: 'Enviado',
    descripcion: 'Sincronizado',
    clase: 'sync-badge-enviado',
    colorVar: 'var(--ok, #2F9E6B)',
  }

  const { Icon, texto, descripcion, clase, colorVar } = config

  return (
    <span
      className={`sync-badge ${clase} ${compacto ? 'sync-badge-compacto' : ''} ${className}`}
      title={descripcion}
      role="status"
      aria-label={`${texto}: ${descripcion}`}
    >
      <Icon size={size} strokeWidth={2} aria-hidden="true" style={{ color: colorVar }} />
      {!compacto && <span className="sync-badge-texto">{texto}</span>}

      <style>{`
        .sync-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: var(--r-capsula, 999px);
          white-space: nowrap;
          line-height: 1.2;
          transition: background-color 0.2s ease;
        }

        .sync-badge-compacto {
          padding: 3px;
          border-radius: 50%;
        }

        .sync-badge-enviado {
          background: color-mix(in srgb, var(--ok, #2F9E6B) 12%, var(--fondo, #fff));
          color: var(--ok, #2F9E6B);
          border: 1px solid color-mix(in srgb, var(--ok, #2F9E6B) 25%, transparent);
        }

        .sync-badge-pendiente {
          background: color-mix(in srgb, var(--lago, #1AA6A0) 12%, var(--fondo, #fff));
          color: var(--lago, #1AA6A0);
          border: 1px solid color-mix(in srgb, var(--lago, #1AA6A0) 30%, transparent);
        }

        .sync-badge-revisar {
          background: color-mix(in srgb, var(--critico, #C8392F) 12%, var(--fondo, #fff));
          color: var(--critico, #C8392F);
          border: 1px solid color-mix(in srgb, var(--critico, #C8392F) 30%, transparent);
        }

        .sync-badge-texto {
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </span>
  )
}

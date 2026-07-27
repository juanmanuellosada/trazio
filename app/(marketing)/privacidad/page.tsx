import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Política de privacidad — Trazio",
  description: "Qué datos guarda Trazio, con quién los comparte y cómo se borran.",
};

/**
 * Bloque 12.9 / decisión D20: texto tomado literal de `docs/legales.md`
 * ("## Política de privacidad"), incluido el punto pendiente sobre el
 * derecho de acceso de la Ley 25.326. No se redacta contenido legal nuevo
 * acá — ver `LegalDraftNotice` para el aviso de que falta aprobación del
 * dueño.
 */
export default function PrivacidadPage() {
  return (
    <LegalPageShell title="Política de privacidad">
      <h2>Qué datos recogemos</h2>
      <p>Recogemos solamente lo necesario para que la app funcione. Tabla por tabla, esto es lo que guardamos:</p>
      <table>
        <thead>
          <tr>
            <th>Qué</th>
            <th>Dónde vive</th>
            <th>Qué incluye</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tu cuenta</td>
            <td>Autenticación de Supabase</td>
            <td>
              Tu correo electrónico y tu contraseña (si te registrás con contraseña) o los datos básicos
              que te identifican si entrás con Google.
            </td>
          </tr>
          <tr>
            <td>Tu perfil</td>
            <td>Tabla profiles</td>
            <td>Tu nombre completo, y una foto de perfil si en algún momento cargás una.</td>
          </tr>
          <tr>
            <td>Tus preferencias</td>
            <td>Tabla user_preferences</td>
            <td>
              Zona horaria, tema claro u oscuro, formato de fecha y hora, en qué día empieza tu semana, y
              tu pantalla y proyecto por defecto al entrar.
            </td>
          </tr>
          <tr>
            <td>Tus proyectos</td>
            <td>Tabla projects</td>
            <td>Nombre, color, ícono, descripción, y si están archivados o marcados como favoritos.</td>
          </tr>
          <tr>
            <td>Tus secciones</td>
            <td>Tabla sections</td>
            <td>El nombre de las secciones dentro de cada proyecto.</td>
          </tr>
          <tr>
            <td>Tus tareas</td>
            <td>Tabla tasks</td>
            <td>
              Título, descripción (con el formato que le des), prioridad, fecha y hora de vencimiento,
              duración estimada, fecha tope, si está completada y cuándo, y la regla de repetición si la
              tarea se repite.
            </td>
          </tr>
          <tr>
            <td>Tus etiquetas</td>
            <td>Tablas labels y task_labels</td>
            <td>El nombre y color de cada etiqueta que creás, y qué tareas tienen cada una.</td>
          </tr>
        </tbody>
      </table>
      <p>
        No guardamos nada más que esto. Si en el futuro Trazio agrega funciones nuevas que impliquen
        guardar otro tipo de dato —comentarios en las tareas, recordatorios push, hábitos, conexión con
        Google Calendar— esta política tiene que actualizarse antes de que esas funciones se activen, no
        después.
      </p>

      <h2>Qué NO recogemos</h2>
      <p>Esto también vale la pena decirlo, porque en Trazio es bastante:</p>
      <ul>
        <li>
          <strong>No hay analítica de comportamiento dentro de la app.</strong> No medimos qué pantallas
          visitás, cuánto tiempo pasás en cada una, ni con qué frecuencia usás cada función.
        </li>
        <li>
          <strong>No hay publicidad.</strong> No mostramos avisos ni los preparamos para mostrar.
        </li>
        <li>
          <strong>No hay perfilado.</strong> No construimos un perfil tuyo para predecir tu
          comportamiento ni para ningún otro fin.
        </li>
        <li>
          <strong>No vendemos tus datos.</strong> A nadie, nunca.
        </li>
        <li>
          <strong>No hay adjuntos.</strong> El producto no permite subir archivos a una tarea ni a un
          comentario, así que no hay imágenes, documentos ni archivos tuyos guardados en ningún lado.
        </li>
      </ul>

      <h2>Con quién compartimos datos, y para qué</h2>
      <p>
        Trazio no funciona solo: usa servicios de terceros para partes puntuales del sistema. Ninguno de
        ellos usa tus datos para su propio beneficio comercial más allá de prestarnos el servicio que
        contratamos.
      </p>
      <table>
        <thead>
          <tr>
            <th>Servicio</th>
            <th>Para qué lo usamos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>
              Aloja la base de datos donde vive todo lo de la tabla anterior, y gestiona el inicio de
              sesión (contraseñas y, si elegís esa opción, el login con Google).
            </td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Envía los correos de confirmación de cuenta y de recuperación de contraseña. No envía nada más.</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Aloja la aplicación web en sí — el código que se ejecuta cuando entrás a Trazio.</td>
          </tr>
          <tr>
            <td>Google</td>
            <td>
              Solo interviene si vos elegís entrar con tu cuenta de Google. Si no usás esa opción, Google
              no recibe ningún dato tuyo de parte de Trazio.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        <strong>Dónde están tus datos.</strong> La base de datos vive en un proyecto de Supabase alojado
        en São Paulo, Brasil (región sa-east-1). Si estás en Argentina, esto significa que tus datos
        cruzan la frontera para guardarse: es una transferencia internacional de datos, y la política
        final tiene que decirlo en esos términos.
      </p>

      <h2>La analítica de la landing es otra cosa</h2>
      <p>
        La página pública de Trazio (la que ves antes de crear una cuenta) mide cuatro cosas, y nada
        más: visitas a la página, clics en el botón principal, interacciones con la demo del parser, y
        cuántos registros se completan. Esto sirve para saber si la landing funciona, no para conocerte a
        vos. Es información agregada de la página pública y no tiene relación con lo que hacés dentro de
        la app una vez que tenés cuenta.
      </p>

      <h2>Cuánto conservamos tus datos, y cómo se borran</h2>
      <p>Guardamos tus datos mientras tu cuenta exista. No hay un límite de tiempo después del cual algo se borra solo.</p>
      <p>El borrado es físico, no hay papelera ni &quot;recuperar lo eliminado&quot;:</p>
      <ul>
        <li>
          <strong>Borrar un proyecto</strong> borra en cascada sus secciones y sus tareas. Es
          irreversible desde el momento en que lo confirmás.
        </li>
        <li>
          <strong>Borrar una sección</strong> no borra sus tareas: quedan sin sección, dentro del mismo
          proyecto.
        </li>
        <li>
          <strong>Borrar una etiqueta</strong> la quita de todas las tareas que la tenían.
        </li>
        <li>
          <strong>Borrar tu cuenta</strong> borra todo lo asociado a ella: perfil, preferencias,
          proyectos, secciones, tareas y etiquetas. No queda nada guardado del lado nuestro.
        </li>
      </ul>

      <h2>Cada cuenta ve solo lo suyo</h2>
      <p>
        El aislamiento entre cuentas no depende únicamente de que la interfaz te muestre solo tus cosas:
        está garantizado en la base de datos, con políticas de seguridad a nivel de fila (row level
        security) que aplican en cada consulta, sin excepción. Ni siquiera un error en la interfaz podría
        mostrarte datos de otra cuenta, porque la base de datos misma los bloquea antes de que lleguen.
      </p>

      <div className="mt-8 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
        <p className="font-semibold text-foreground">⚠ Punto pendiente: derecho de acceso (Ley 25.326)</p>
        <p>
          La Ley 25.326 de protección de datos personales de Argentina le reconoce a cada titular el
          derecho de acceder a sus propios datos personales. Trazio tomó la decisión de no incluir
          exportación de datos en ninguna versión (ver <code>docs/decisions.md</code>, decisión D3) — y
          esa decisión se tomó a pesar de que se recomendó lo contrario justamente por este motivo.
        </p>
        <p>
          Hoy no existe ninguna forma automática de entregarle a una persona una copia de sus datos. Si
          alguien lo pide, no hay un botón ni un proceso ya armado para responder.
        </p>
        <p>
          Este borrador no resuelve esta tensión ni promete algo que el producto no hace. Queda marcado
          acá para que el dueño del proyecto decida cómo se responde: si se arma un proceso manual para
          pedidos de acceso, si se reconsidera la decisión D3, o si se asume el riesgo de forma
          consciente.
        </p>
      </div>

      <h2>Qué le falta decidir al dueño antes de publicar</h2>
      <p>
        Este documento no se publica tal cual. Antes de publicarlo hace falta que alguien con criterio
        legal (el dueño del proyecto, o un abogado) resuelva lo siguiente:
      </p>
      <ul>
        <li>
          <strong>Derecho de acceso de la Ley 25.326</strong> — ver el recuadro de arriba. Es el punto
          más urgente porque hoy no hay respuesta.
        </li>
        <li>
          Si hace falta designar un responsable de datos (o figura equivalente) ante la Agencia de
          Acceso a la Información Pública, y quién lo es.
        </li>
        <li>Jurisdicción aplicable en caso de conflicto — este borrador no fija ninguna.</li>
        <li>
          <strong>Un correo de contacto para consultas de privacidad.</strong> Hoy no existe ninguna
          dirección publicada para que alguien pregunte por sus datos, pida que se borren, o haga un
          reclamo. Hace falta crear una y ponerla acá antes de publicar.
        </li>
      </ul>
    </LegalPageShell>
  );
}

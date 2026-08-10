import type { Metadata } from "next";
import { LegalPageShell } from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Política de privacidad — Trazio",
  description: "Qué datos guarda Trazio, con quién los comparte y cómo se borran.",
};

/**
 * Bloque 12.9 / decisión D20: texto base tomado de `docs/legales.md`
 * ("## Política de privacidad"), incluido el punto pendiente sobre el
 * derecho de acceso de la Ley 25.326. No se redacta contenido legal nuevo
 * acá — ver `LegalDraftNotice` para el aviso de que falta aprobación del
 * dueño.
 *
 * Actualizado para incorporar comentarios, recordatorios push, hábitos y la
 * conexión con Google Calendar (fases 2 a 4), verificado contra el esquema
 * y el código real. `docs/legales.md` todavía tiene la versión anterior de
 * este texto y hay que sincronizarlo aparte.
 *
 * Actualizado además por `openspec/changes/servidor-mcp/` (decisión D63) con
 * la sección de conectar un asistente de IA por MCP: texto escrito junto con
 * la propuesta, antes de que el servidor exista, para que la política nunca
 * quede corriendo detrás de la función una vez que se active.
 */
export default function PrivacidadPage() {
  return (
    <LegalPageShell title="Política de privacidad">
      <h2>Qué datos recogemos</h2>
      <p>Recogemos solamente lo necesario para que la app funcione. Tabla por tabla, esto es lo que guardamos:</p>
      <table className="table-fixed sm:table-auto [&_td]:break-words [&_th]:break-words">
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
          <tr>
            <td>Tus comentarios</td>
            <td>Tabla comments</td>
            <td>El texto con formato que escribís en el hilo de comentarios de una tarea.</td>
          </tr>
          <tr>
            <td>Tus recordatorios</td>
            <td>Tabla reminders</td>
            <td>El momento en que tiene que sonar cada recordatorio, y si ya se mandó.</td>
          </tr>
          <tr>
            <td>Tus dispositivos con avisos activados</td>
            <td>Tabla push_subscriptions</td>
            <td>
              Por cada dispositivo en el que activaste notificaciones, la dirección y las claves que
              necesita el servicio de notificaciones push de tu navegador para poder mandarte un aviso.
            </td>
          </tr>
          <tr>
            <td>Tus hábitos</td>
            <td>Tabla habits</td>
            <td>
              Nombre, ícono, color, duración, horario, y con qué frecuencia se repite (todos los días,
              cierta cantidad de veces por semana, o días puntuales).
            </td>
          </tr>
          <tr>
            <td>Qué días cumpliste cada hábito</td>
            <td>Tabla habit_completions</td>
            <td>La fecha en la que lo marcaste como hecho. Nada más.</td>
          </tr>
          <tr>
            <td>Cambios de horario puntuales de un hábito</td>
            <td>Tabla habit_schedule_overrides</td>
            <td>
              El horario distinto que le pusiste a un hábito para un día específico, sin tocar su horario
              habitual.
            </td>
          </tr>
          <tr>
            <td>Tu conexión con Google Calendar</td>
            <td>Tabla calendar_connections</td>
            <td>
              Tu refresh token, cifrado, y qué calendarios de Google elegiste mostrar en Trazio. Los
              eventos de tu calendario no están en esta lista a propósito — más abajo explicamos por qué.
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Eso es todo lo que guardamos hoy. Las cuatro funciones que en algún momento estaban pendientes
        —comentarios, recordatorios push, hábitos y la conexión con Google Calendar— ya están en
        producción, y quedaron incorporadas arriba con el mismo detalle que el resto. Si en el futuro
        Trazio agrega una función nueva que implique guardar otro tipo de dato, esta política tiene que
        actualizarse antes de que esa función se active, no después.
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
              Interviene en dos casos: si elegís entrar con tu cuenta de Google, y si conectás tu Google
              Calendar. En el segundo caso, le pedimos tus eventos cada vez que abrís el calendario en
              Trazio, y si desde ahí creás, editás o borrás un evento, ese cambio se manda a Google. Si no
              usás ninguna de las dos opciones, Google no recibe ningún dato tuyo de parte de Trazio.
            </td>
          </tr>
          <tr>
            <td>El servicio de notificaciones push de tu navegador (Google, Mozilla o Apple, según cuál
              uses)</td>
            <td>
              Cuando se dispara un recordatorio, le mandamos el título de la tarea para que te llegue la
              notificación. Es el único dato que sale así: no le mandamos tu correo ni el resto de tu
              cuenta.
            </td>
          </tr>
          <tr>
            <td>El asistente de IA que vos elijas conectar (por ejemplo Claude o ChatGPT)</td>
            <td>
              Este tercero no lo elegimos nosotros: lo elegís vos, y solo interviene si vos autorizás la
              conexión. Una vez conectado, puede leer y escribir tu cuenta de Trazio por conversación. Más
              abajo explicamos exactamente qué puede hacer y qué limitación tiene ese acceso.
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

      <h2>Cómo funciona la conexión con Google Calendar</h2>
      <p>Esta es la función que más vale la pena explicar bien, porque es distinta a todo lo demás de esta lista.</p>
      <ul>
        <li>
          <strong>Los eventos de tu Google Calendar no se guardan en ningún lado.</strong> Cada vez que
          abrís el calendario en Trazio, le pedimos tus eventos a la API de Google en ese momento, los
          mostramos, y quedan en la memoria del servidor hasta un minuto nada más. No existe ninguna tabla
          con tus eventos.
        </li>
        <li>
          <strong>Lo único que persiste es tu refresh token, cifrado.</strong> Es la credencial que le
          permite a Trazio pedirle eventos a Google sin que tengas que volver a iniciar sesión cada vez.
          Se guarda cifrado con AES-256-GCM, nunca en texto plano, y el descifrado ocurre solo en el
          servidor: ese token nunca llega a tu navegador.
        </li>
        <li>
          También guardamos qué calendarios de Google elegiste mostrar en Trazio, para no tener que
          preguntarte cada vez que entrás.
        </li>
        <li>
          <strong>Tus tareas y tus hábitos de Trazio no se publican en Google.</strong> La conexión
          funciona en un solo sentido para ellos: de Google hacia Trazio, nunca al revés.
        </li>
        <li>
          Si desde el calendario de Trazio creás, editás o borrás un evento de Google, ese cambio sí se
          manda a Google —es lo que hace la integración—, pero ese evento tampoco queda guardado en
          nuestra base: seguimos sin tener una copia propia, solo mostramos lo que hay en tu cuenta de
          Google en cada consulta.
        </li>
        <li>
          <strong>Desconectar borra la conexión, y nada más.</strong> Se elimina el registro con tu
          refresh token cifrado y no toca ninguna tarea, hábito ni ningún otro dato tuyo en Trazio.
        </li>
      </ul>

      <h2>Cómo funciona conectar un asistente de IA</h2>
      <p>
        Trazio permite conectar un asistente de IA (por ejemplo Claude o ChatGPT) para leer y modificar tu
        cuenta por conversación. Es distinto a todo lo demás de esta lista porque el tercero que recibe
        acceso no lo elegimos nosotros: lo elegís vos, y solo pasa si vos lo autorizás.
      </p>
      <ul>
        <li>
          <strong>Vos autorizás la conexión, con una pantalla propia de Trazio.</strong> Antes de darle
          acceso a un asistente, te mostramos qué aplicación lo está pidiendo, para que apruebes o
          rechaces con esa información a la vista.
        </li>
        <li>
          <strong>Podés revocarlo cuando quieras.</strong> Desde Configuración → Aplicaciones conectadas
          ves cada asistente que autorizaste y podés cortarle el acceso en el momento: deja de poder usar
          tu cuenta de inmediato, no en un rato. No hace falta cambiar tu contraseña ni hacer nada más.
        </li>
        <li>
          <strong>El asistente ve exactamente lo mismo que ves vos, ni más ni menos.</strong> El acceso
          está sujeto a las mismas reglas de seguridad que ya aíslan tu cuenta del resto (la misma fila por
          fila de la sección anterior): un asistente conectado a tu cuenta no puede ver ni tocar los datos
          de otra cuenta.
        </li>
        <li>
          <strong>Trazio no le ofrece al asistente ninguna forma de borrar.</strong> Crear, editar,
          completar tareas y archivar sí están disponibles por esta vía; borrar no — eso se hace
          exclusivamente desde la app, donde hay confirmación y la posibilidad de deshacer.
        </li>
        <li>
          <strong>Punto importante que tenés que conocer antes de conectar uno.</strong> No existe hoy una
          forma de darle a un asistente un acceso limitado a &quot;solo leer&quot;: es una limitación de la
          tecnología en la que se apoya esta función, no una elección nuestra. En términos prácticos, el
          acceso que autorizás le permite a quien lo tenga leer y modificar tu cuenta igual que vos
          podrías hacerlo. La excepción es borrar: Trazio bloquea el borrado a nivel de base de datos
          para cualquier acceso que llegue por esta conexión, así que ni el asistente ni quien tuviera
          ese token puede borrar nada tuyo por acá, aunque sí puede leer y modificar el resto igual que
          vos. Conectá solamente asistentes en los que confiés, de la misma forma en que
          confiarías tu contraseña.
        </li>
      </ul>

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

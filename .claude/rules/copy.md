---
paths:
  - "app/**"
  - "components/**"
---

# Reglas de redacción

Todos los textos de la interfaz están en **español rioplatense**, con tratamiento
de "vos". No hay traducciones ni archivos de idioma: el texto va directo en el código.

## Voz

Directa y tranquila. La app organiza, no arenga. Nada de signos de exclamación en
cadena, nada de emojis en textos de sistema, nada de motivación forzada.

- Sí: "Tu bandeja de entrada está vacía."
- No: "¡Felicitaciones! ¡Lograste vaciar tu bandeja! 🎉"

## Voseo

Imperativos en segunda persona rioplatense: **agregá**, **poné**, **elegí**,
**guardá**, **buscá**, **volvé**, **probá**, **contá**.

Nunca: agrega, pon, elige, guarda, busca, vuelve, prueba, cuenta.

## Botones

Verbo en infinitivo para acciones neutras ("Guardar", "Cancelar", "Eliminar") o en
imperativo voseado cuando invita a algo ("Probalo gratis", "Creá tu cuenta").
Elegir uno por contexto y ser consistente dentro de la misma pantalla.

## Errores

Tres partes: qué pasó, por qué, qué hacer. Sin culpar al usuario, sin códigos
técnicos visibles.

- Sí: "No pudimos guardar el cambio porque se cortó la conexión. Revisá tu internet
  y volvé a intentar."
- No: "Error 500: Internal Server Error."

Como la app es 100% online, el mensaje de "sin conexión" es frecuente y tiene que
ser claro y sin dramatismo: la app no funciona sin internet, y eso se dice sin
rodeos.

## Vacíos

Un estado vacío explica qué va a aparecer ahí y ofrece la acción para empezar.
Nunca una pantalla en blanco.

## Mayúsculas

Sentence case en todos lados: títulos, botones, etiquetas, encabezados de tabla.
Nunca Title Case, nunca MAYÚSCULAS SOSTENIDAS.

## Fechas

Formato según la preferencia del usuario. En texto corrido usar lenguaje natural
("hoy", "mañana", "el martes") antes que la fecha numérica cuando está a menos de
una semana.

## Precisión sobre plazos técnicos

Cuando un texto describe algo que tiene una demora real, no prometas algo
instantáneo si no lo es del todo. Decí el plazo real en lenguaje simple en vez
de redondearlo a "al instante" o a "poco tiempo". Es matiz de honestidad, no
alarma: no se trata de advertir un riesgo de seguridad, sino de describir bien
lo que efectivamente pasa.

- Sí (revocar el acceso de un asistente de IA conectado): "pierde al instante
  la posibilidad de renovarlo, y lo que ya tenía autorizado se apaga solo,
  como máximo, en una hora."
- No: "podés cortarle el acceso en el momento" (cuando lo ya emitido puede
  seguir funcionando hasta una hora más).

**Registro:** 2026-08-10 — política de privacidad, sección "Cómo funciona
conectar un asistente de IA". El texto original decía que revocar cortaba el
acceso "en el momento", pero medido contra el stack (`docs` de
`openspec/changes/servidor-mcp/design.md`, decisión D-K) el access token ya
emitido sigue sirviendo contra la base hasta que vence solo, una hora
después. Se corrigió el texto para separar lo que sí es inmediato (dejar de
poder renovar el acceso) de lo que tarda hasta una hora en apagarse solo, en
vez de elegir entre mentir por omisión o sonar alarmista.

## Palabras del producto

Vocabulario fijo. Usar siempre el mismo término:

| Concepto | Se dice | No se dice |
| --- | --- | --- |
| Contenedor de tareas | proyecto | lista, carpeta |
| Agrupación dentro de un proyecto | sección | columna, grupo |
| Tarea dentro de otra | subtarea | tarea hija |
| Destino por defecto | Bandeja de entrada | inbox, entrada |
| Búsqueda guardada | filtro | vista, consulta |
| Hilo de notas de una tarea | comentarios | notas |
| Rutina que se repite | hábito | rutina, costumbre |

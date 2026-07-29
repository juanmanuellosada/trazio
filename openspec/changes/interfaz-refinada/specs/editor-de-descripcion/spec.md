## MODIFIED Requirements

### Requirement: Autodetección de sintaxis de markdown en la entrada

El editor SHALL reconocer sintaxis de markdown mientras se escribe y
convertirla en el formato correspondiente en el momento, tanto al empezar un
bloque como dentro de un párrafo ya empezado: por ejemplo, escribir `#`
seguido de un espacio al inicio de una línea SHALL producir un título, nunca
el carácter `#` literal, y escribir `**texto**` dentro de un párrafo ya
empezado SHALL producir negrita, sin dejar los asteriscos como texto
literal. La autodetección en línea SHALL cubrir negrita, cursiva, tachado,
código en línea y resaltado — la misma familia de formato que ya ofrece la
barra de herramientas. Esta autodetección SHALL ser exclusivamente de
entrada: el contenido SHALL seguir guardándose como el documento estructurado
de Tiptap que exige la capacidad `tareas`, nunca como texto plano con marcas
de markdown.

#### Scenario: Escribir `#` produce un título, no el carácter

- **WHEN** se escribe `# ` (numeral seguido de espacio) al inicio de una línea
  vacía del editor
- **THEN** la línea se convierte en un título
- **AND** el carácter `#` no queda como texto literal en el documento

#### Scenario: Escribir negrita, cursiva, tachado, código o resaltado dentro de un párrafo produce el formato

- **WHEN** se escribe `**texto**`, `*texto*`, `~~texto~~`, `` `texto` `` o
  `==texto==` dentro de un párrafo ya empezado
- **THEN** el texto queda en negrita, cursiva, tachado, código en línea o
  resaltado, según corresponda
- **AND** ninguna de las marcas de sintaxis (`**`, `*`, `~~`, el backtick o
  `==`) queda como texto literal en el documento

#### Scenario: Lo guardado sigue siendo el documento estructurado, no texto con marcas

- **WHEN** la autodetección de markdown convierte texto escrito en formato,
  sea al empezar un bloque (título, lista, cita) o dentro de un párrafo ya
  empezado (negrita, cursiva, tachado, código, resaltado)
- **THEN** el contenido se guarda en la columna `description` como documento
  jsonb de Tiptap
- **AND** ninguna marca de sintaxis markdown (como `#`, `**` o `-`) queda
  almacenada como parte del texto

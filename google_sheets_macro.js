/**
 * GOOGLE APPS SCRIPT - REGISTRO POR FILAS (FORZABIKE)
 *
 * Este script registra cada prenda en una fila individual para permitir
 * filtrado y mejor gestión de inventario.
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Definición de columnas solicitadas
    // Col A: ID Pedido, Col B: Fecha, Col C: Cliente, Col D: Prenda, Col E: Talla, Col F: Cantidad, Col G: Año, Col H: Género, Col I: Especial
    var headers = ["ID Pedido", "Fecha", "Cliente", "Prenda", "Talla", "Cantidad", "Año", "Género", "Especial"];

    // Inicializar hoja si está vacía
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }

    var pedidoId = String(data.pedido_id);

    // 1. ELIMINAR REGISTROS PREVIOS (Para que al editar no se dupliquen las filas)
    var values = sheet.getDataRange().getValues();
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][0] == pedidoId) {
        sheet.deleteRow(i + 1);
      }
    }

    // 2. INSERTAR NUEVAS FILAS (Una por cada prenda elegida)
    if (data.items && data.items.length > 0) {
      var rowsToInsert = data.items.map(function(item) {
        return [
          pedidoId,
          data.fecha,
          data.cliente,
          item.name,
          item.size,
          item.qty,
          item.year,
          item.gender,
          item.special || ""
        ];
      });

      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, headers.length).setValues(rowsToInsert);
    }

    sheet.autoResizeColumns(1, headers.length);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Pedido registrado por filas exitosamente"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

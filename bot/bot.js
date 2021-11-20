require('dotenv').config()

const { Telegraf } = require('telegraf')
    //Para las solicitudes al API
const axios = require('axios');

//Telegraf facilita la creación del bot
const bot = new Telegraf(process.env.BOT_TOKEN);

let token;
let userMail;
let user_id;

const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const URL_BE = "http://localhost:8088/v1/";

bot.help(ctx => {
    const helpMessage = `
    *Timesheet Manager Bot*
    /start - Iniciar bot
    /login user pass

    `

    bot.telegram.sendMessage(ctx.from.id, helpMessage, {
        parse_mode: 'Markdown'
    })
})

bot.command('start', (ctx) => {
    sendStartMessage(ctx);
})

function sendStartMessage(ctx) {
    const startMessage = `Bienvenid@ ` + ctx.from.first_name + `. 
    Es necesario iniciar sesion para continuar.
    Por favor, escriba el comando /login, su usuario 
    y su contraseña separados por un espacio.
        Ejemplo: 
            /login user@mail.com password
        `;
    ctx.reply(startMessage);
}

bot.command('login', async(ctx) => {

    const Error = `Formato incorrecto.
    Debe ingresar los datos solicitados.
        Formato: 
            /login user@mail.com password
        `;

    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    let user, pass = '';

    if (hilera.length < 3 || hilera.length > 3) {
        ctx.reply(Error);
    } else {
        if (hilera[1].includes('@')) {
            user = hilera[1];
            pass = hilera[2];

            let resultado = "";
            try {
                resultado = await login({ username: '' + user, password: '' + pass });
            } catch (err) {
                console.log("Error debido a " + err);
            }

            if (typeof(resultado) == "string") {
                ctx.reply(resultado);
            } else {
                if (resultado.username == user) {
                    ctx.reply("Bienvenido, ha iniciado sesión correctamente.");
                    menuInicial(ctx);
                } else {
                    ctx.reply("Ha ocurrido un error...");
                }
            }

        } else {
            ctx.reply("El usuario no tiene el formato correcto");
        }
    }
})



function menuInicial(ctx) {
    const menuMessage = "¿Qué desea hacer?";
    bot.telegram.sendMessage(ctx.chat.id, menuMessage, {
        reply_markup: {
            keyboard: [
                [
                    { text: "Ver TimeSheets" },
                    { text: "Crear TimeSheet" },
                    { text: "Borrar TimeSheet" }
                ],
                [
                    { text: "Ver Times" },
                    { text: "Crear Time" },
                    { text: "Borrar Time" }
                ],
                [
                    { text: "Salir" }
                ]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    })
}

bot.action('credits', ctx => {
    ctx.answerCbQuery();
    ctx.reply('Creado por Cristóbal');
})


bot.hears('Ver TimeSheets', async(ctx) => {
    let datos = await getTimeSheets();

    ctx.reply(mostrarTimeSheets(datos));

})

bot.hears('Ver Times', ctx => {
    let datos = `Para ver los Times de un timesheet,
    debe ejecutar el comando /verTimes seguido del  
    ID del timesheet como en el siguiente ejemplo:

    /verTimes ID

    Nota:

    Para ver la lista de Timesheets presione 
    "Ver TimeSheets"
    `;

    ctx.reply(datos);

})

bot.command('verTimes', async(ctx) => {

    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    let id = hilera[1];


    if (!(await existeTimeSheet(id))) {
        ctx.reply("El timesheet con el id " + id + " no existe");
        return;
    }

    let datos = await getTimes();

    ctx.reply(mostrarTimes(id, datos));
})

bot.hears('Crear TimeSheet', (ctx) => {
    let datos = `Para crear un nuevo TimeSheet,
    debe ejecutar el siguiente comando:

    /create dd-mm-yyyy

    `;

    ctx.reply(datos);

})

bot.hears('Crear Time', (ctx) => {
    let datos = `Para crear un nuevo Time,
    debe ejecutar el siguiente comando:

    /createTime id_timesheet mo:tu:we:th:fr:sa:su

    Donde:
    id_timesheet => El timesheet al que agregará horas
    mo => las horas realizadas el Lunes
    tu => las horas realizadas el Martes
    we => las horas realizadas el Miercoles
    th => las horas realizadas el Jueves
    fr => las horas realizadas el Viernes
    sa => las horas realizadas el Sabado
    su => las horas realizadas el Domingo
    `;

    ctx.reply(datos);

})

bot.hears('Borrar TimeSheet', (ctx) => {
    let datos = `Para borrar un TimeSheet,
    debe ejecutar el comando /delete seguido del  
    ID del timesheet como en el siguiente ejemplo:

    /delete ID

    Nota:

    Al borrar el timesheet tambien borrará los
    times asignados a este.

    Para ver la lista de Timesheets presione 
    "Ver TimeSheets"
    `;

    ctx.reply(datos);

})

bot.hears('Borrar Time', (ctx) => {
    let datos = `Para borrar un Time,
    debe ejecutar el comando /deleteTime seguido del  
    ID del time como en el siguiente ejemplo:

    /deleteTime ID

    Nota:

    Para ver la lista de Times de un timesheet presione 
    "Ver Times" para mas información
    `;

    ctx.reply(datos);

})

function mostrarTimeSheets(datos) {

    let resultado = `Lista de TimeSheets`;

    datos.forEach(dato => {
        if (dato.owner.id == user_id) {
            resultado = resultado + `
            <=======================
            |ID => ` + dato.id + `
            |Date => ` + dato.weekDateId + `
            |Hours => ` + dato.totalHours + `
            |state => ` + dato.state.name + `
            <=======================
            `
        }
    });

    return resultado;
}

function mostrarTimes(id, datos) {

    let resultado = `Lista de Times de timesheet ` + id;
    let cant = 0;
    datos.forEach(dato => {
        if (dato.timesheet.id == id) {
            cant += 1;
            resultado = resultado + `
            <=======================
            |ID => ` + dato.id + `
            |Hours Mo => ` + dato.moHours + `
            |Hours Tu => ` + dato.tuHours + `
            |Hours We => ` + dato.weHours + `
            |Hours Th => ` + dato.thHours + `
            |Hours Fr => ` + dato.frHours + `
            |Hours Sa => ` + dato.saHours + `
            |Hours Su => ` + dato.suHours + `
            |Total => ` + dato.totalHours + `
            <=======================
            `
        }
    });

    if (cant == 0) {
        resultado = resultado + `
        
        No hay Times registrados.
        `
    }

    return resultado;
}

bot.command('create', async(ctx) => {
    const d = new Date();

    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    let fecha = hilera[1];
    fecha = fecha.split('-');
    //
    let month = monthNames[fecha[1] - 1];
    let year = d.getFullYear();
    let stateId = 5;
    let weekDate = month + ' ' + fecha[0] + ', ' + year;

    let res = await createTimeSheet(user_id, month, fecha[0], year, stateId, weekDate);

    if (res == '200') {
        ctx.reply("Se ha creado el timesheet con éxito");
        let datos = await getTimeSheets();
        ctx.reply(mostrarTimeSheets(datos));
    } else {
        ctx.reply("error");
    }

})

bot.command('createTime', async(ctx) => {

    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    let id = hilera[1];
    let horas = hilera[2].split(':');
    //

    if (!(await existeTimeSheet(id))) {
        ctx.reply("El timesheet con id " + id + " no existe");
        return;
    }

    let res = await createTime(id, horas);

    if (res == '200') {
        ctx.reply("Se ha creado el time con éxito");
        let datos = await getTimeSheets();
        ctx.reply(mostrarTimeSheets(datos));
    } else {
        ctx.reply("error");
    }

})

bot.command('delete', async(ctx) => {
    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    if (hilera.length <= 1) {
        ctx.reply("Debe digitar el ID del TimeSheet");
        return;
    }
    let id = hilera[1];

    if (!(await existeTimeSheet(id))) {
        ctx.reply("El timesheet con el id " + id + " no existe");
        return;
    }
    try {
        let resultado = await deleteTimeSheet(id);
        ctx.reply("Se ha borrado correctamente, codigo " + resultado);
        let datos = await getTimeSheets();
        ctx.reply(mostrarTimeSheets(datos));
    } catch (err) {
        console.log(err);
        ctx.reply("Ha ocurrido un error al borrar");
    }


})

bot.command('deleteTime', async(ctx) => {
    let texto = ctx.message.text;
    let hilera = texto.split(' ');
    if (hilera.length <= 1) {
        ctx.reply("Debe digitar el ID del Time");
        return;
    }
    let id = hilera[1];


    if (!(await existeTime(id))) {
        ctx.reply("El time con el id " + id + " no existe");
        return;
    }

    try {
        let resultado = await deleteTime(id);
        ctx.reply("Se ha borrado correctamente, codigo " + resultado);
    } catch (err) {
        console.log(err);
        ctx.reply("Ha ocurrido un error al borrar");
    }
})

//========================= FUNCIONES AL BACK_END ============================

async function login(parm) {
    try {
        let res = await axios.post(URL_BE + 'users/login', parm);
        if (res.headers.authorization != null) {
            token = res.headers.authorization.split(" ");
            token = token[1];
            userMail = res.data.username;
            user_id = await getUserIdByEmail(userMail);
        }
        return res.data;
    } catch (err) {

        if ((String)(err).includes('code 401')) {
            return "Credenciales incorrectas, favor verificar";
        }
        console.log("Error en " + err);
    }
}

async function getUserIdByEmail() {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await axios.get(URL_BE + 'users', { headers });
        let userID;
        res.data.forEach(user => {
            if (user.email == userMail) {
                userID = user.id;
            }
        });

        return userID;
    } catch (err) {
        console.log("Error en getUserIdByEmail " + err);
        return "Ocurrió un error";
    }
}

async function getTimeSheets() {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        let res = await axios.get(URL_BE + 'timesheets', { headers });

        for (let e of res.data) {
            let horas = await getHoursByTimeSheetID(e.id);
            e.totalHours = horas;
        }

        return res.data;
    } catch (err) {
        console.log("Error en GetTimeSheets " + err);
        return "Ocurrió un error";
    }
}

async function getTimes() {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        let res = await axios.get(URL_BE + 'times', { headers });
        return res.data;
    } catch (err) {
        console.log("Error en GetTimes " + err);
        return "Ocurrió un error";
    }
}

async function deleteTimeSheet(id) {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {

        if (!(await existeTimeSheet(id))) {
            ctx.reply("El timesheet con el id " + id + " no existe");
            return;
        }

        let ids = await getTimeIdsByTimeSheetID(id);

        for (let i = 0; i < ids.length; i++) {
            await deleteTime(ids[i]);
        }
        const res = await axios.delete(URL_BE + 'timesheets/' + id, { headers });
        return res.status;
    } catch (err) {
        console.log("Error en DeleteTimeSheets " + err);
        return "Ocurrió un error";
    }
}

async function deleteTime(id) {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await axios.delete(URL_BE + 'times/' + id, { headers });
        return res.status;
    } catch (err) {
        console.log("Error en DeleteTime " + err);
        return "Ocurrió un error";
    }
}

async function createTimeSheet(userId, month, day, year, stateId, weekDate) {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    let campos = {
        "managerId": userId,
        "monday": day,
        "month": month,
        "year": year,
        "weekDateId": weekDate,
        "stateId": stateId,
        "ownerId": userId
    };

    try {
        const res = await axios.post(URL_BE + 'timesheets', campos, { headers });
        return res.status;
    } catch (err) {
        console.log("Error en CreateTimeSheets " + err);
        return "Ocurrió un error";
    }
}

async function createTime(timesheet_id, horas) {

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    let campos = {
        "moHours": horas[0],
        "tuHours": horas[1],
        "weHours": horas[2],
        "thHours": horas[3],
        "frHours": horas[4],
        "saHours": horas[5],
        "suHours": horas[6],
        "timesheetId": timesheet_id,
        "departmentId": 2,
    };

    try {
        const res = await axios.post(URL_BE + 'times', campos, { headers });
        return res.status;
    } catch (err) {
        console.log("Error en CreateTimes " + err);
        return "Ocurrió un error";
    }
}

async function getHoursByTimeSheetID(id) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await axios.get(URL_BE + 'times', { headers });
        let horas = 0;
        res.data.forEach(e => {
            if (e.timesheet.id == id) {
                horas += e.totalHours;
            }
        });

        return horas;
    } catch (err) {
        console.log("Error en getHoursByTimesheetId " + err);
        return "Ocurrió un error";
    }

}

async function getTimeIdsByTimeSheetID(id) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await axios.get(URL_BE + 'times', { headers });
        let ids = [];
        res.data.forEach(e => {
            if (e.timesheet.id == id) {
                ids.push(e.id);
            }
        });

        return ids;
    } catch (err) {
        console.log("Error en getTimeIdsByTimesheetId " + err);
        return "Ocurrió un error";
    }

}

async function existeTimeSheet(id) {
    let timesheets = await getTimeSheets();
    let cont = 0;

    timesheets.forEach(e => {
        if (e.id == id) {
            cont += 1;
        }
    });

    if (cont == 0) {
        return false;
    } else {
        return true;
    }
}

async function existeTime(id) {
    let times = await getTimes();
    let cont = 0;

    times.forEach(e => {
        if (e.id == id) {
            cont += 1;
        }
    });

    if (cont == 0) {
        return false;
    } else {
        return true;
    }
}

//========================= FIN FUNCIONES AL BACK_END ============================

bot.hears('Salir', ctx => {
    bot.telegram.sendMessage(ctx.chat.id, "Hasta luego", {
        reply_markup: {
            remove_keyboard: true
        }
    })
})

bot.launch();
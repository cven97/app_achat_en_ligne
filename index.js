const express = require("express");
require('dotenv/config')
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();

const cookieParser = require("cookie-parser");
const sessions = require('express-session');

 
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype]
        let uploadError = new Error('type de fichier invalide !')

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, './uploads')
    },
    filename: function (req, file, cb) {

        const filename = file.originalname.split(" ").join("-");
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, filename + '-' + Date.now() + '.' + extension)
    }
})

const uploadOption = multer({ storage: storage });

//****************************** MIDLEWARE **********************************************

const api = process.env.API_URL;

const app = express()

app.use(bodyParser.json());
app.use(cors());
app.options('*', cors());
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(cookieParser());

const twoDay = 48*60*60*1000;
var session;


app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: twoDay },
    resave: false
}));


let db = new sqlite3.Database('./db/api_achat_db.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        return console.error(err.message);
    }
    console.log('Base de données connecté !');
});

//*************************************************************************************** */

// requettes pour configurer le serveur

app.get(api + '/config/ERTHVBJN864532', (req, res) => {

    db.run('DROP TABLE IF EXISTS `produit`;', function (err, resultat) {
        
        if (err) throw err;

        db.run('CREATE TABLE produit (`id` INTEGER PRIMARY KEY,`libelle` TEXT NOT NULL,`description` TEXT NOT NULL,`prix` TEXT NOT NULL,`image` TEXT NOT NULL,`date` TEXT NOT NULL,`stock` INTEGER NOT NULL)', function (err) {

            if (err) throw err;

            db.run('DROP TABLE IF EXISTS `panier`;', function (err, resultat) {
                if (err) throw err;

                db.run('CREATE TABLE panier (`id` INTEGER PRIMARY KEY,`id_produit` INTEGER NOT NULL, `id_user` TEXT NOT NULL, `quantite` INTEGER NOT NULL)', function (err) {
                    if (err) throw err;
                    res.status(200).json({ success: true, message: "Configuration terminé !" })

                });

            })

        });
    })
})

//*********************************************** REQUETTES ************************************************/


app.get(api + '/produit', (req, res) => {

    db.all("SELECT id,libelle, description, prix FROM produit", function (err, resultat) {

        if (err) throw err;
        res.send(resultat);
    })
})

app.get(api + '/produit/:id', (req, res) => {

    db.all("SELECT * FROM produit WHERE id = '" + req.params.id + "'", function (err, resultat) {
        if (err) throw err;
        //console.log(resultat);
        if (resultat.length)
            res.send(resultat);
        else
            res.status(404).json({ success: false, message: "produit non trouver !" })

    })
})

app.post(api + '/produit', uploadOption.single('image'), (req, res) => {

    const file = req.file;

    if (!file)
        res.status(400).json({ success: false, message: "pas d'image dans la requette !" })

    const filename = file.filename;
    const basePath = req.protocol + '://' + req.get('host') + '/uploads/';

    db.run("INSERT INTO `produit`(`libelle`, `description`, `prix`, `image`, `date`, `stock`) VALUES (?,?,?,?,?,?)", [req.body.libelle, req.body.description, req.body.prix, basePath + filename, Date(), req.body.stock], function (err, resultat) {

        if (err)
            res.status(400).json({ success: false, message: "produit non ajouté !" })
        else
            res.status(200).json({ success: true, message: "produit ajouté !" })

    })

})

app.delete(api + '/produit/:id', (req, res) => {

    db.run("DELETE FROM `produit` WHERE id = '" + req.params.id + "'", function (err, resultat) {
        if (err) throw err;

        // console.log(this);

        if (!this.changes)
            res.status(404).json({ success: false, message: "produit non trouver !" })
        else
            res.status(404).json({ success: true, message: "produit suprimer avec succes !" });
    })
})

app.put(api + '/product/:id', (req, res) => {

    con.query("UPDATE `produits` SET `nom`='" + req.body.nom + "',`description`='" + req.body.description + "',`plus_description`='" + req.body.plus_description + "',`image`='" + req.body.image + "',`images`='" + req.body.images + "',`prix`='" + req.body.prix + "',`id_categorie`='" + req.body.id_categorie + "',`quantiteStock`='" + req.body.quantiteStock + "',`evaluation`='" + req.body.evaluation + "' WHERE id_Produits = '" + req.params.id + "'", function (err, resultat) {
        if (err) throw err;

        //console.log("affectedRows = "+resultat.affectedRows);



        if (!resultat.affectedRows)
            res.status(404).json({ success: false, message: "Données utilisateur non trouver !" })
        else
            res.send(resultat);
        // res.status(404).json({success: true, message: "Données utilisateur modifier avec succes !"});
    })
})

app.get(api + '/panier/all', (req, res) => {

    db.all("SELECT * FROM panier", function (err, resultat) {
        if (err) throw err;
        session = req.session;

        res.send(resultat);
    })
})

app.get(api + '/panier', (req, res) => {

    session = req.session;

    if (!session.userid) {
        session.userid = craeteUserId(15);
        // res.send(session.userid);

    }


    db.all("SELECT produit.id,produit.libelle, produit.description, produit.prix  FROM produit WHERE produit.id IN (SELECT id_produit FROM panier WHERE id_user = '" + session.userid + "')", function (err, resultat) {
        if (err) throw err;
        session = req.session;
        res.send(resultat);
    })

    // console.log(craeteUserId(10));

})

app.get(api + '/panier/:id', (req, res) => {

    session = req.session;

    if (!session.userid){
        session.userid = craeteUserId(15);
    }

    db.all("SELECT produit.* FROM produit WHERE produit.id IN (SELECT id_produit FROM panier WHERE id_produit = '" + req.params.id + "' AND id_user = '" + session.userid + "')", function (err, resultat) {
        if (err) throw err;
        session = req.session;

        if (resultat.length) {
            res.send(resultat);
        }
        else
            res.status(200).json({ success: false, message: "produit non trouvé dans le panier !" })

    })

})

app.post(api + '/panier/:id', (req, res) => {


    session = req.session;

    if (!session.userid) {
        session.userid = craeteUserId(15);
    }

    db.all("SELECT * FROM produit WHERE id = '" + req.params.id + "'", function (err, resultat) {
        if (err) throw err;
        //console.log(resultat);
        if (resultat.length) {

            db.all("SELECT id FROM panier WHERE id_produit = '" + req.params.id + "' AND id_user = '" + session.userid + "'", function (err, resultat) {
                // if (err) throw err;
                //console.log(resultat);

                if (resultat.length) {

                    res.status(200).json({ success: false, message: "produit existe deja dans le panier !" })

                }
                else {
                    db.run("INSERT INTO panier(id_user, id_produit, quantite) VALUES (?,?,?)", [session.userid, req.params.id, 1], function (err, resultat) {

                        if (err) {
                            res.status(400).json({ success: false, message: "produit non ajouté au panier !" })
                        } else
                            res.status(200).json({ success: true, message: "produit ajouté au panier !" })

                    })
                }
            })


        }
        else
            res.status(404).json({ success: false, message: "produit non trouver !" })

    })



})

function craeteUserId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


//**********************************************************************************************************/

// Ecoute serveur
app.listen(3000, () => {
    //console.log("");
    console.log("server is running on http://localhost:3000");
})


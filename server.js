 // from browser type :    http://localhost:3000/

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const koneksi = require('./config/database.js');

const app = express()
const port = 3000

// app.use(express.static('public'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');

// Menangani rute untuk halaman utama
app.get('/', (req, res) => {
    const querySql = 'SELECT * FROM ujian';

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        // const dataFromDatabase = [
        //     { id: 1, name: 'Item 1', price: 10 },
        //     { id: 2, name: 'Item 2', price: 20 },
        //     // ...
        // ];
        rows.forEach(row=>{
            dataFromDatabase.push(row)
        })
        res.render('index', { title: 'Node.js EJS Tutorial',data: dataFromDatabase });
    });
  });

app.get('/lihatUjian/:id', (req, res) => {
    const querySql = `SELECT * FROM ujian WHERE id = ${req.params.id}`;

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        let soal = JSON.parse(rows[0].soal);
        // rows.forEach(row=>{
        //     row.soal = JSON.parse(row.soal)
        //     dataFromDatabase.push(row)
        //     soal.push(row.soal)
        // })
        // console.log(soal.length)
        
        res.render('lihatUjian', { title: 'Node.js EJS Tutorial',data: rows[0], soal });
    });
  });

app.get('/buatUjian', (req, res) => {
    res.render('buatUjian');
  });
app.post('/buatUjian', (req, res) => {
    const data = { ...req.body };
    const jumlahSoal = parseInt(data.jumlah_soal);
    const tingkatKesulitan = {
        mudah: (parseInt(data.mudah) / 100) * jumlahSoal,
        sedang: (parseInt(data.sedang) / 100) * jumlahSoal,
        sulit: (parseInt(data.sulit) / 100) * jumlahSoal,
    };
    // console.log("tingkatKesulitan",tingkatKesulitan)

    // Lakukan pemilihan soal berdasarkan kriteria
    // const selectedSoals = selectSoals(data.mata_kuliah, tingkatKesulitan, jumlahSoal);

    const query = `
    SELECT * FROM soal
    WHERE mata_kuliah = ? AND
        tingkat_kesulitan IN (?, ?, ?)
    ORDER BY RAND()
    `;

    // Parameter untuk query
    const params = [
        data.mata_kuliah,
        'mudah', 'sedang', 'sulit'
    ];

    let selectedSoals = [];

    koneksi.query(query, params, (err, results) => {
        if (err) {
            console.error('Error selecting soals:', err);
        } else {
            // Distribusi soal sesuai dengan tingkat kesulitan yang diinginkan
            // console.log("results ",results)
            selectedSoals = distributeSoals(results, tingkatKesulitan);

            const ujianData = {
                mata_kuliah: data.mata_kuliah,
                jenis: data.jenis,
                jumlah_soal: jumlahSoal,
                durasi: parseInt(data.durasi),
                tanggal: data.tanggal,
                jam: data.jam,
                soal: JSON.stringify(selectedSoals)
            };

            saveSelectedSoalsToUjian(ujianData);
            // console.log('Selected soals:', selectedSoals);
        }
    });

    // Redirect atau berikan respons sesuai kebutuhan
    res.redirect('/');  // Ganti dengan halaman yang sesuai
});

function distributeSoals(soals, tingkatKesulitan) {
    // Hitung jumlah soal yang harus dipilih untuk masing-masing tingkat kesulitan
    const jumlahMudah = Math.ceil(tingkatKesulitan.mudah);
    const jumlahSedang = Math.ceil(tingkatKesulitan.sedang);
    const jumlahSulit = Math.ceil(tingkatKesulitan.sulit);
    // console.log("Ceil = ",jumlahMudah,jumlahSedang,jumlahSulit)

    // Pisahkan soal-soal berdasarkan tingkat kesulitan
    const mudahSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Mudah');
    const sedangSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Sedang');
    const sulitSoals = soals.filter(soal => soal.tingkat_kesulitan === 'Sulit');
    // console.log("Jumlah = ",mudahSoals.length,sedangSoals.length,sulitSoals.length)

    if (mudahSoals.length < jumlahMudah || sedangSoals.length < jumlahSedang || sulitSoals.length < jumlahSulit) {
        console.error('Tidak cukup soal untuk memenuhi persyaratan kesulitan.');
        return [];
    }

    // Ambil jumlah soal sesuai dengan kriteria
    const selectedMudahSoals = mudahSoals.splice(0, jumlahMudah);
    const selectedSedangSoals = sedangSoals.splice(0, jumlahSedang);
    const selectedSulitSoals = sulitSoals.splice(0, jumlahSulit);
    // console.log("Tingkat = ",selectedMudahSoals.length,selectedSedangSoals.length,selectedSulitSoals.length)
    // Gabungkan soal-soal yang terpilih dari masing-masing tingkat kesulitan
    const selectedSoals = [
        ...selectedMudahSoals,
        ...selectedSedangSoals,
        ...selectedSulitSoals
    ];

    return selectedSoals;
}
  
  
// Fungsi untuk menyimpan soal ke tabel "ujian"
function saveSelectedSoalsToUjian(ujianData) {
    // Query untuk menyimpan soal ke dalam tabel "ujian"
    const query = 'INSERT INTO ujian SET ?';

    koneksi.query(query, ujianData, (err, results) => {
        if (err) {
        console.error('Error saving ujian:', err);
        } else {
        console.log('Saved ujian to database:', results);
        }
    });
}
  
  
app.get('/soal', (req, res) => {

    const querySql = 'SELECT * FROM soal';

    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        let dataFromDatabase = [];
        // const dataFromDatabase = [
        //     { id: 1, name: 'Item 1', price: 10 },
        //     { id: 2, name: 'Item 2', price: 20 },
        //     // ...
        // ];
        rows.forEach(row=>{
            dataFromDatabase.push(row)
        })
        res.render('soal', { title: 'Node.js EJS Tutorial',data: dataFromDatabase });
    });

});

app.get('/tambahSoal', (req, res) => {
    res.render('tambahSoal', { title: 'Tambah Soal Page' });
});

app.post('/tambahSoal', (req, res) => {
    // Tangani data yang diterima dari formulir di sini
    // const { mata_kuliah, tingkat_kesulitan, pertanyaan } = req.body;

    // Simpan data ke database atau lakukan operasi lainnya
    // buat variabel penampung data dan query sql
    const data = { ...req.body };
    const querySql = 'INSERT INTO soal SET ?';

    // jalankan query
    koneksi.query(querySql, data, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Gagal insert data mahasiswa!', error: err });
        }

        // jika request berhasil
        // res.status(201).json({ success: true, message: 'Berhasil insert data mahasiswa!' });
        res.redirect('/soal');
    });
});

app.get('/students', (req, res) => {
    // buat query sql
    const querySql = 'SELECT * FROM mahasiswa';
    console.log('Ini GET' );

    // jalankan query
    koneksi.query(querySql, (err, rows, field) => {
        // error handling
        if (err) {
            return res.status(500).json({ message: 'Ada kesalahan', error: err });
        }

        // jika request berhasil
        res.status(200).json({ success: true, data: rows });
    });
});

// app.get('/soal', (req, res) => {
//     // Buat query SQL
//     const querySql = 'SELECT * FROM soal';
  
//     // Jalankan query
//     koneksi.query(querySql, (err, rows, fields) => {
//       if (err) {
//         return res.status(500).json({ message: 'Ada kesalahan', error: err });
//       }
  
//       // Baca file soal.html
//       fs.readFile('soal.html', (err, data) => {
//         if (err) {
//           res.writeHead(500, { 'Content-Type': 'text/html' });
//           res.end('Internal Server Error');
//         } else {
//           // Gabungkan form HTML dengan data mahasiswa
//           const html = data.toString().replace('{{soal}}', renderSoalList(rows));
  
//           res.writeHead(200, { 'Content-Type': 'text/html' });
//           res.end(html);
//         }
//       });
//     });
//   });

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

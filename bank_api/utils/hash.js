import bcrypt from "bcrypt";

export async function hashpassword(password) {
  return new Promise(async (resolve) => {
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(password, "aliriza", function (err, hash) {
        console.log(hash);
        resolve(hash);
      });
    });
  });
}

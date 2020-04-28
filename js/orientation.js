/**
 * @file Handles orientation in 4-space and mathematical operations regarding vectors and other geometric constructs.
 * 
 * Acknowledgements:
 * 	- Marc ten Bosch's (primer)[https://marctenbosch.com/quaternions/] on rotors, bivectors, and vectors for 3D orientation. Made quaternions a lot more intuitive for me, and gave me the concept of rotors so I didn't have to figure out how octonions could possibly fit into this!
 * 	- Mathoma's (video lectures)[https://www.youtube.com/watch?v=iwQlrgAduMg&list=PLpzmRsG7u_gqaTo_vEseQ7U8KFvtiJY4K&index=13] that go a little more in depth about rotors and geometric algebra. Gave a few examples and proofs to fully drive in the geometric algebra techniques and the vectors' behavior!
 */

/**
 * @class Used to represent general properties of grade-n vectors and sums of them.
 */
class Polymultivector {
	// Maybe reimplement for instances to be arrays themselves... then won't have to repeatedly construct or cache array
	asArray() {
		return [];
	}

	*[Symbol.iterator]() {
		yield* this.asArray();
	}

	// get lengthSq() {
	// 	return this.asArray().reduce((cumsum, value) => cumsum + value * value);
	// }

	// get length() {
	// 	return Math.sqrt(this.lengthSq);
	// }
}

 /**
 * @class Sum of a scalar and a 4D bivector, together given by the geometric product of two 4D vectors.
 * 
 * Equivalent to an octonion, representing orientation or rotation in 4D space. 4D analog of a 3D rotor, which is
 * equivalent to a quaternion.
 * 
 * *Built off of Marc ten Bosch's 3D rotor implementation (https://marctenbosch.com/quaternions/code.htm)*
 */
export class Rotor4 extends Polymultivector {
	/**
	 * Determines the angle of this rotation.
	 * @type number
	 */
	scalar;
	/**
	 * Determines the plane of this rotation.
	 * @type Bivector4
	 */
	bivector;

	/**
	 * Coefficient of the grade-4 vector. This only results from multiplying (compositing) 4D rotors with each other and not
	 * from geometric products.
	 * @type number
	 */
	xyzw;

	/**
	 * 
	 * @param {number} scalar 
	 * @param {Bivector4} bivector 
	 * @param {number} xyzw 
	 */
	constructor(scalar, bivector, xyzw=0) {
		super();

		this.scalar = scalar;
		this.bivector = bivector;
		this.xyzw = xyzw;
	}
	
	/**
	 * Computes the rotor between two 4D vectors.
	 * 
	 * Fails if the vectors are colinear (in which case there is more than one possible rotor).
	 * @param {Vector4} vector0 
	 * @param {Vector4} vector1 
	 * @returns {Rotor4} 
	 */
	static between(vector0, vector1) {
		return new Rotor4(1 + vector0.dot(vector1), vector0.outer(vector1)).normalize();
	}

	/**
	 * Creates a rotor with the given coefficients.
	 * 
	 * @param {number} scalar 
	 * @param {number} xy 
	 * @param {number} xz 
	 * @param {number} xw 
	 * @param {number} yz 
	 * @param {number} yw 
	 * @param {number} zw 
	 * @param {number} xyzw 
	 */
	static coefficients(scalar, xy, xz, xw, yz, yw, zw, xyzw) {
		return new Rotor4(scalar, new Bivector4(xy, xz, xw, yz, yw, zw), xyzw);
	}

	scale(scalar) {
		this.scalar *= scalar;
		this.bivector.scale(scalar);

		return this;
	}

	normalize() {
		this.scale(1 / this.length);

		return this;
	}

	inverse() {
		return new Rotor4(this.scalar, this.bivector.opposite()).normalize();
	}

	/**
	 * Multiplies this rotor by a given rotor.
	 * 
	 * Used to bundle multiple rotations into a single rotor.
	 * @param {Rotor4} rotor
	 * @returns {Rotor4}  
	 */
	mult(rotor) {
		// The formula below is derived by representing the bivectors in standard unit vector notation and then
		// distributing

		const r0 = this.asArray();
		const r1 = rotor.asArray();

		return Rotor4.coefficients(
			+ r0[0]*r1[0] - r0[1]*r1[1] - r0[2]*r1[2] - r0[3]*r1[3] - r0[4]*r1[4] - r0[5]*r1[5] - r0[6]*r1[6] - r0[7]*r1[7], // 1
			+ r0[1]*r1[0] + r0[0]*r1[1] + r0[4]*r1[2] + r0[5]*r1[3] - r0[2]*r1[4] - r0[3]*r1[5] - r0[7]*r1[6] - r0[6]*r1[7], // XY
			+ r0[2]*r1[0] - r0[4]*r1[1] + r0[0]*r1[2] + r0[6]*r1[3] + r0[1]*r1[4] + r0[7]*r1[5] - r0[3]*r1[6] + r0[5]*r1[7], // XZ
			+ r0[3]*r1[0] - r0[5]*r1[1] - r0[6]*r1[2] + r0[0]*r1[3] - r0[7]*r1[4] + r0[1]*r1[5] + r0[2]*r1[6] + r0[4]*r1[7], // XW
			+ r0[4]*r1[0] + r0[2]*r1[1] - r0[1]*r1[2] - r0[7]*r1[3] + r0[0]*r1[4] + r0[6]*r1[5] - r0[5]*r1[6] - r0[3]*r1[7], // YZ
			+ r0[5]*r1[0] + r0[3]*r1[1] + r0[7]*r1[2] - r0[1]*r1[3] - r0[6]*r1[4] + r0[0]*r1[5] + r0[4]*r1[6] + r0[2]*r1[7], // YW
			+ r0[6]*r1[0] - r0[7]*r1[1] + r0[3]*r1[2] - r0[2]*r1[3] + r0[5]*r1[4] - r0[4]*r1[5] + r0[0]*r1[6] - r0[1]*r1[7], // ZW
			+ r0[7]*r1[0] + r0[6]*r1[1] - r0[5]*r1[2] + r0[4]*r1[3] + r0[3]*r1[4] - r0[2]*r1[5] + r0[1]*r1[6] + r0[0]*r1[7], // XYZW
		);
	}

	/**
	 * Applies this rotor onto a 4D vector.
	 * @param {Vector4} vector 
	 * @returns {Vector4}
	 */
	rotate(vector) {
		// Rotating a vector with a rotor is a matter of premultiplying the vector and the rotor's inverse, then
		// postmultiplying the vector with the rotor
		// The formula below is derived by representing the grade-N vectors in standard unit vector notation and then
		// distributing

		// Multiplying a rotor's inverse by a vector gives a grade-1 vector added to a grade-3 vector

		const r0 = this.inverse().asArray(); // [1, XY, XZ, XW, YZ, YW, ZW, XYZW]
		const v0 = vector.asArray(); // [X, Y, Z, W]

		const v1 = [
			+ r0[0]*v0[0] + r0[1]*v0[1] + r0[2]*v0[2] + r0[3]*v0[3], // X
			- r0[1]*v0[0] + r0[0]*v0[1] + r0[4]*v0[2] + r0[5]*v0[3], // Y
			- r0[2]*v0[0] - r0[4]*v0[1] + r0[0]*v0[2] + r0[6]*v0[3], // Z
			- r0[3]*v0[0] - r0[5]*v0[1] - r0[6]*v0[2] + r0[0]*v0[3], // W

			+ r0[4]*v0[0] - r0[2]*v0[1] + r0[1]*v0[2] + r0[7]*v0[3], // XYZ
			+ r0[5]*v0[0] - r0[3]*v0[1] - r0[7]*v0[2] + r0[1]*v0[3], // XYW
			+ r0[6]*v0[0] + r0[7]*v0[1] - r0[3]*v0[2] + r0[2]*v0[3], // XZW
			- r0[7]*v0[0] + r0[6]*v0[1] - r0[5]*v0[2] + r0[4]*v0[3], // YZW
		];

		// Multiplying the previous construct by the rotor gives back a vector (all grade-3 coefficients cancel)
		
		const r1 = this.asArray();

		return new Vector4(
			+ v1[0]*r1[0] - v1[1]*r1[1] - v1[2]*r1[2] - v1[3]*r1[3] - v1[4]*r1[4] - v1[5]*r1[5] - v1[6]*r1[6] + v1[7]*r1[7], // X
			+ v1[1]*r1[0] + v1[0]*r1[1] + v1[4]*r1[2] + v1[5]*r1[3] - v1[2]*r1[4] - v1[3]*r1[5] - v1[7]*r1[6] + v1[7]*r1[7], // Y
			+ v1[2]*r1[0] - v1[4]*r1[1] + v1[0]*r1[2] + v1[6]*r1[3] + v1[1]*r1[4] + v1[7]*r1[5] - v1[3]*r1[6] + v1[7]*r1[7], // Z
			+ v1[3]*r1[0] - v1[5]*r1[1] - v1[6]*r1[2] + v1[0]*r1[3] - v1[7]*r1[4] + v1[1]*r1[5] + v1[2]*r1[6] + v1[7]*r1[7], // W
		);
	}

	/**
	 * Performs a spherical linear interpolation between this rotor and another.
	 * 
	 * *Formula provided by https://en.wikipedia.org/wiki/Slerp*
	 * @param {Rotor4} rotor 
	 * @param {number} time 
	 *
	slerp(rotor, time) {

	}
	probably not necessary until keyframe animation*/

	/**
	 * @override
	 */
	asArray() {
		return [this.scalar, ...this.bivector, this.xyzw];
	}

	/**
	 * Squared magnitude of this rotor.
	 */
	get lengthSq() {
		return this.scalar ** 2 + this.bivector.lengthSq;
	}
	
	/**
	 * Magnitude of this rotor.
	 */
	get length() {
		return Math.sqrt(this.lengthSq);
	}

	get angle() {
		return 2 * Math.acos(this.scalar);
	}
}

/**
 * @class Grade-2 (2D-array-like) vector, given by the outer product of two 4D vectors.
 * 
 * Unlike a grade-1 vector, its components represent areas and not lengths. This allows it to represent a plane. WHen
 * added with a scalar, it can represent a rotation angle across this plane.
 * 
 * The plane is not represented as a mathematical object in this circumstance; rotation across a plane occurs when
 * multiplying a rotor by a vector or other rotor.
 */
export class Bivector4 extends Polymultivector {
	xy;
	xz;
	xw;
	yz;
	yw;
	zw;

	constructor(xy, xz, xw, yz, yw, zw) {
		super();

		this.xy = xy;
		this.xz = xz;
		this.xw = xw;
		this.yz = yz;
		this.yw = yw;
		this.zw = zw;
	}

	scale(scalar) {
		this.xy *= scalar;
		this.xz *= scalar;
		this.xw *= scalar;
		this.yz *= scalar;
		this.yw *= scalar;
		this.zw *= scalar;
	}

	/**
	 * Computes and returns the additive inverse of this vector. Achievable by swapping the order of the vectors in the
	 * outer product used to generate it.
	 * @returns {Bivector4}
	 */
	opposite() {
		return new Bivector4(-this.xy, -this.xz, -this.xw, -this.yz, -this.yw, -this.zw);
	}

	asArray() {
		return [this.xy, this.xz, this.xw, this.yz, this.yw, this.zw];
	}

	*[Symbol.iterator]() {
		yield* this.asArray();
	}

	get lengthSq() {
		return this.xy ** 2 + this.xz ** 2 + this.xw ** 2 + this.yz ** 2 + this.yw ** 2 + this.zw ** 2;
	}
}

/**
 * @class Grade-1 vector with 4 components, one for each dimension in 4D. 
 */
export class Vector4 extends Polymultivector {
	x;
	y;
	z;
	w;

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} z 
	 * @param {number} w 
	 */
	constructor(x=0, y=0, z=0, w=0) {
		super();

		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	/**
	 * 
	 * @param {Vector4} vector 
	 * @returns {number} 
	 */
	dot(vector) {
		return this.x * vector.x
				+ this.y * vector.y
				+ this.z * vector.z
				+ this.w * vector.w;
	}

	/**
	 * 
	 * @param {Vector4} vector 
	 * @returns {Bivector4} 
	 */
	outer(vector) {
		return new Bivector4(
			this.x * vector.y - vector.x * this.y,
			this.x * vector.z - vector.x * this.z,
			this.x * vector.w - vector.x * this.w,
			this.y * vector.z - vector.y * this.z,
			this.y * vector.w - vector.y * this.w,
			this.z * vector.w - vector.z * this.w,
		);
	}

	scale(scalar) {
		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;
		this.w *= scalar;

		return this;
	}

	normalize() {
		this.scale(1 / this.length);

		return this;
	}

	asArray() {
		return [this.x, this.y, this.z, this.w];
	}

	*[Symbol.iterator]() {
		yield* this.asArray();
	}

	get lengthSq() {
		return this.x ** 2 + this.y ** 2 + this.z ** 2 + this.w ** 2;
	}
	get length() {
		return Math.sqrt(this.lengthSq);
	}
}
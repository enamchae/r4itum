/**
 * @file Defines mathematical operations regarding vectors and other vector algebra constructs in 4-space, including rotors (orientation).
 * 
 * Acknowledgements:
 * 	- Marc ten Bosch's [primer](https://marctenbosch.com/quaternions/) on rotors, bivectors, and vectors for 3D orientation. Made quaternions a lot more intuitive for me, and gave me the concept of rotors so I didn't have to figure out how octonions could possibly fit into this!
 * 	- Mathoma's [video lectures](https://www.youtube.com/watch?v=iwQlrgAduMg&list=PLpzmRsG7u_gqaTo_vEseQ7U8KFvtiJY4K&index=13) that go a little more in depth about rotors and geometric algebra. Gave a few examples and proofs to fully drive in the geometric algebra techniques and the vectors' behavior!
 */

/**
 * @class Used to represent general properties of rank-n vectors and sums of them.
 */
class Polymultivector extends Array {
	constructor(length, elements) {
		super(length || 0);

		this.set(...elements);

		// Prevent new elements from being added
		Object.seal(this);
	}

	set(...elements) {
		// Fill array with given elements or 0s if missing/falsy
		let i = 0;
		while (i < this.length) {
			this[i] = elements?.[i] || 0;
			i++;
		}

		return this;
	}

	/**
	 * Multiplies all components by a real number *in place*.
	 * @param {number} scalar 
	 */
	scale(scalar) {
		for (let i = 0; i < this.length; i++) {
			this[i] *= scalar;
		}

		return this;
	}

	normalize() {
		this.scale(1 / this.mag);

		return this;
	}

	get magSq() {
		// Sum of all components squared
		let cumsum = 0;
		for (const component of this) {
			cumsum += component ** 2;
		}

		return cumsum;
	}

	get mag() {
		return Math.sqrt(this.magSq);
	}
}

 /**
 * @class Sum of the even-rank vectors available in 4-space, together given by the geometric product of two 4D vectors.
 * 
 * Components are stored as coefficients in the order [1, xy, xz, xw, yz, yw, zw, xyzw].
 * 
 * Equivalent to a pair of quaternions, representing rotation in 4D space. It is the 4D analog of a 3D rotor, which is
 * equivalent to a single quaternion.
 * 
 * *Built off of Marc ten Bosch's 3D rotor implementation (https://marctenbosch.com/quaternions/code.htm)*
 */
export class Rotor4 extends Polymultivector {
	/**
	 * Determines the angle of this rotation.
	 * @type number
	 */
	// scalar;
	/**
	 * Determines the plane of this rotation.
	 * @type Bivector4
	 */
	// bivector;

	/**
	 * Coefficient of the rank-4 vector. This only results from multiplying (compositing) 4D rotors with each other and not
	 * from geometric products.
	 * @type number
	 */
	// xyzw;


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
	constructor(scalar=1, xy=0, xz=0, xw=0, yz=0, yw=0, zw=0, xyzw=0) {
		super(8, [scalar, xy, xz, xw, yz, yw, zw, xyzw]);
	}
	
	/**
	 * Computes the rotor that rotates from `vector0` to `vector1`, two 4D vectors.
	 * 
	 * Fails if the vectors are colinear (in which case there is more than one possible rotor).
	 * @param {Vector4} vector0 
	 * @param {Vector4} vector1 
	 * @returns {Rotor4} 
	 */
	static between(vector0, vector1) {
		// Why do I need to add 1 to the dot product?
		return this.scalarBivector(1 + vector0.dot(vector1), vector0.outer(vector1)).normalize();
	}

	/**
	 * 
	 * 
	 * @param {number} scalar 
	 * @param {Bivector4} bivector 
	 * @param {number} xyzw 
	 * @returns {Rotor4}
	 */
	static scalarBivector(scalar, bivector, xyzw) {
		return new this(scalar, ...bivector, xyzw);
	}

	/**
	 * 
	 * @param {number[]} axisComponents The [xy, xz, xw, yz, yw, zw, xyzw] basis coefficients comprising the rotor's
	 * plane. The values will be normalized when passed to the rotor.
	 * 
	 * The passed object will not be modified.
	 * @param {number} angle 
	 */
	static planeAngle(axisComponents, angle) {
		const axis = new Polymultivector(7, axisComponents).normalize().scale(Math.sin(angle / 2));

		return new this(Math.cos(angle / 2), ...axis);
	}

	inverse() {
		return new Rotor4(this[0], -this[1], -this[2], -this[3], -this[4], -this[5], -this[6], -this[7]);
	}

	/**
	 * Multiplies this rotor by a given rotor.
	 * 
	 * Used to bundle multiple rotations into a single rotor.
	 * @param {Rotor4} rotor
	 * @returns {Rotor4}  
	 */
	mult(rotor) {
		// The formula below is derived by representing the bivectors in standard unit vector form and then
		// distributing

		const r0 = this;
		const r1 = rotor;

		return new Rotor4(
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
	 * 
	 * @param {Vector4} vector The starting vector, which will not be modified.
	 * @returns {Vector4} A new 4D vector with the rotation applied.
	 */
	rotateVector(vector) {
		// Rotating a vector with a rotor is a matter of premultiplying the vector and the rotor's inverse, then
		// postmultiplying the result with the rotor
		// The formula below is derived by representing the rank-N vectors in standard unit vector form and then
		// distributing

		// Multiplying a rotor's inverse by a vector gives a rank-1 vector added to a rank-3 vector

		const r0 = this.inverse();
		const v0 = vector;

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

		// Multiplying the previous construct by the rotor gives back a vector (all rank-3 coefficients cancel)
		
		const r1 = this;

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


	get angle() {
		return 2 * Math.acos(this[0]);
	}
}

/**
 * @class Rank-2 (2D-array-like) vector, given by the outer product of two 4D vectors.
 * 
 * Components are stored in the order [xy, xz, xw, yz, yw, zw].
 * 
 * Unlike a rank-1 vector, its components represent areas and not lengths. This allows it to represent a plane. WHen
 * added with a scalar, it can represent a rotation angle across this plane.
 * 
 * The plane is not represented as a mathematical object in this circumstance; rotation across a plane occurs when
 * multiplying a rotor by a vector or other rotor.
 */
export class Bivector4 extends Polymultivector {
	/**
	 * [0] :: xy
	 * [1] :: xz
	 * [2] :: xw
	 * [3] :: yz
	 * [4] :: yw
	 * [5] :: zw
	 */

	constructor(xy, xz, xw, yz, yw, zw) {
		super(6, [xy, xz, xw, yz, yw, zw]);
	}

	/**
	 * Computes and returns the additive inverse of this vector. Achievable by swapping the order of the vectors in the
	 * outer product used to generate it.
	 * @returns {Bivector4}
	 */
	opposite() {
		return new Bivector4(-this[0], -this[1], -this[2], -this[3], -this[4], -this[5]);
	}
}

/**
 * @class Rank-1 vector with 4 components, one for each dimension in 4D. 
 */
export class Vector4 extends Polymultivector {
	/**
	 * [0] :: x
	 * [1] :: y
	 * [2] :: z
	 * [3] :: w
	 */

	/**
	 * 
	 * @param {number} x 
	 * @param {number} y 
	 * @param {number} z 
	 * @param {number} w 
	 */
	constructor(x, y, z, w) {
		super(4, [x, y, z, w]);
	}

	/**
	 * 
	 * @param {Vector4} vector 
	 * @returns {number} 
	 */
	dot(vector) {
		return this[0] * vector[0]
				+ this[1] * vector[1]
				+ this[2] * vector[2]
				+ this[3] * vector[3];
	}

	/**
	 * 
	 * @param {Vector4} vector 
	 * @returns {Bivector4} 
	 */
	outer(vector) {
		return new Bivector4(
			this[0] * vector[1] - vector[0] * this[1], // XY
			this[0] * vector[2] - vector[0] * this[2], // XZ
			this[0] * vector[3] - vector[0] * this[3], // XW
			this[1] * vector[2] - vector[1] * this[2], // YZ
			this[1] * vector[3] - vector[1] * this[3], // YW
			this[2] * vector[3] - vector[2] * this[3], // ZW
		);
	}
	
	// https://hollasch.github.io/ray4/Four-Space_Visualization_of_4D_Objects.html
	cross(vector0, vector1) {
		// Gives all the necessary determinants (intermediary matrix implicit)
		const bivector = vector0.outer(vector1);

		return new Vector4(
			+ (this[1] * bivector[5]) - (this[2] * bivector[4]) + (this[3] * bivector[3]),
			- (this[0] * bivector[5]) + (this[2] * bivector[2]) - (this[3] * bivector[1]),
			+ (this[0] * bivector[4]) - (this[1] * bivector[2]) + (this[3] * bivector[0]),
			- (this[0] * bivector[3]) + (this[1] * bivector[1]) - (this[2] * bivector[0]),
		);
	}

	add(vector) {
		return new Vector4(
			this[0] + vector[0],
			this[1] + vector[1],
			this[2] + vector[2],
			this[3] + vector[3],
		);
	}

	subtract(vector) {
		return new Vector4(
			this[0] - vector[0],
			this[1] - vector[1],
			this[2] - vector[2],
			this[3] - vector[3],
		);
	}
}
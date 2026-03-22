import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public lastname: string;

  @Column()
  public firstname: string;

  @Column({ unique: true })
  public email: string;

  @Column()
  password: string;

  @Column()
  role: string;

  @Column()
  address: string;

  @Column()
  enabled: boolean;
}

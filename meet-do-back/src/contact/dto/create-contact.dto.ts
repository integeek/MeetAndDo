import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ContactCategorie {
  GENERAL     = 'general',
  COMPTE      = 'compte',
  RESERVATION = 'reservation',
  ACTIVITE    = 'activite',
  PAIEMENT    = 'paiement',
  TECHNIQUE   = 'technique',
  SIGNALEMENT = 'signalement',
  AUTRE       = 'autre',
}

export enum ContactPriorite {
  BASSE   = 'basse',
  NORMALE = 'normale',
  HAUTE   = 'haute',
  URGENTE = 'urgente',
}

export class CreateContactDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nom: string;

  @IsEmail({}, { message: "L'adresse email n'est pas valide." })
  @IsNotEmpty({ message: "L'email est obligatoire." })
  @MaxLength(255, { message: "L'email ne peut pas dépasser 255 caractères." })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le numéro ne peut pas dépasser 20 caractères.' })
  @Matches(/^[+\d\s\-().]{7,20}$/, { message: 'Numéro de téléphone invalide.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  telephone?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le sujet est obligatoire.' })
  @MinLength(5, { message: 'Le sujet doit contenir au moins 5 caractères.' })
  @MaxLength(200, { message: 'Le sujet ne peut pas dépasser 200 caractères.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  sujet: string;

  @IsString()
  @IsNotEmpty({ message: 'Le message est obligatoire.' })
  @MinLength(20, { message: 'Le message doit contenir au moins 20 caractères.' })
  @MaxLength(2000, { message: 'Le message ne peut pas dépasser 2000 caractères.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message: string;

  @IsOptional()
  @IsEnum(ContactCategorie, { message: 'Catégorie invalide.' })
  categorie?: ContactCategorie;

  @IsOptional()
  @IsEnum(ContactPriorite, { message: 'Priorité invalide.' })
  priorite?: ContactPriorite;
}
